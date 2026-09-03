import { listSlipsInFolder, downloadFileAsBase64 } from '@/lib/google/drive';
import { analyzeSlipImage } from '@/lib/ai/gemini-slip-ocr';
import { appendTransactionRows, ensureSheetStructure } from '@/lib/google/sheets';
import { isSlipProcessed, markSlipProcessed } from '@/lib/db/sqlite';
import { syncStatementsFromDrive } from '@/lib/statement/parser';
import { Transaction } from '@/types';

/**
 * Executes a full synchronization of Slips and e-Statements
 * Runs both in sequence with caching and returns execution stats.
 */
export async function executeFullSync() {
  const startTime = Date.now();
  console.log(`[Auto-Sync] 🔄 Starting background sync at ${new Date().toISOString()}...`);

  await ensureSheetStructure();

  // 1. Sync Slips
  const kplusFolderId = process.env.GOOGLE_DRIVE_KPLUS_FOLDER_ID;
  const makeFolderId = process.env.GOOGLE_DRIVE_MAKE_FOLDER_ID;

  const foldersToScan = [
    { id: kplusFolderId, account: 'K PLUS' },
    { id: makeFolderId, account: 'Make by KBank' },
  ].filter((f): f is { id: string; account: string } => Boolean(f.id));

  let slipsProcessed = 0;
  let slipsSkipped = 0;
  let slipsFailed = 0;
  let transfersCount = 0;
  const newTransactionsToAppend: Transaction[] = [];

  for (const folder of foldersToScan) {
    try {
      const files = await listSlipsInFolder(folder.id);

      for (const file of files) {
        if (isSlipProcessed(file.id)) {
          slipsSkipped++;
          continue;
        }

        try {
          const { base64, mimeType } = await downloadFileAsBase64(file.id);
          const slipData = await analyzeSlipImage(base64, mimeType, folder.account);

          if (slipData.isSelfTransfer) {
            transfersCount++;
          }

          const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const slipLink = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;

          const newTx: Transaction = {
            id: txId,
            date: slipData.date,
            time: slipData.time,
            type: slipData.type,
            amount: slipData.amount,
            category: slipData.category,
            account: folder.account,
            note: slipData.note,
            slipUrl: slipLink,
            driveFileId: file.id,
            source: 'AUTO_SYNC',
            createdAt: new Date().toISOString(),
          };

          newTransactionsToAppend.push(newTx);

          markSlipProcessed({
            driveFileId: file.id,
            account: folder.account,
            amount: slipData.amount,
            transactionDate: slipData.date,
            status: 'SUCCESS',
          });

          slipsProcessed++;
        } catch (err: any) {
          slipsFailed++;
          console.error(`[Auto-Sync] Error processing slip ${file.name}:`, err.message);
          markSlipProcessed({
            driveFileId: file.id,
            account: folder.account,
            status: 'FAILED',
          });
        }
      }
    } catch (err: any) {
      console.error(`[Auto-Sync] Error listing folder ${folder.account}:`, err.message);
    }
  }

  if (newTransactionsToAppend.length > 0) {
    await appendTransactionRows(newTransactionsToAppend);
  }

  // 2. Sync Statements
  let stmResult: any = { skipped: true };
  try {
    stmResult = await syncStatementsFromDrive();
  } catch (err: any) {
    console.error('[Auto-Sync] Error syncing statements:', err.message);
  }

  const durationMs = Date.now() - startTime;
  console.log(
    `[Auto-Sync] ✅ Finished in ${durationMs}ms: Slips new=${slipsProcessed}, skipped=${slipsSkipped}, Statement=${stmResult.skipped ? 'cached' : 'updated'}`
  );

  return {
    success: true,
    timestamp: new Date().toISOString(),
    durationMs,
    slips: {
      processed: slipsProcessed,
      skipped: slipsSkipped,
      failed: slipsFailed,
      transfers: transfersCount,
    },
    statement: stmResult,
  };
}

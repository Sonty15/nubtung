import { listSlipsInFolder, downloadFileAsBase64 } from '@/lib/google/drive';
import { analyzeSlipImage } from '@/lib/ai/gemini-slip-ocr';
import { appendTransactionRows, ensureSheetStructure } from '@/lib/google/sheets';
import { isSlipProcessed, markSlipProcessed } from '@/lib/db/sqlite';
import { syncStatementsFromDrive } from '@/lib/statement/parser';
import { Transaction } from '@/types';

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const results: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    results.push(array.slice(i, i + chunkSize));
  }
  return results;
}

/**
 * Executes a full synchronization of Slips and e-Statements in high-speed parallel mode
 */
export async function executeFullSync() {
  const startTime = Date.now();
  console.log(`[Auto-Sync] 🔄 Starting high-speed background sync at ${new Date().toISOString()}...`);

  await ensureSheetStructure();

  const kplusFolderId = process.env.GOOGLE_DRIVE_KPLUS_FOLDER_ID;
  const makeFolderId = process.env.GOOGLE_DRIVE_MAKE_FOLDER_ID;

  // Prioritize Make by KBank first
  const foldersToScan = [
    { id: makeFolderId, account: 'Make by KBank' },
    { id: kplusFolderId, account: 'K PLUS' },
  ].filter((f): f is { id: string; account: string } => Boolean(f.id));

  let slipsProcessed = 0;
  let slipsSkipped = 0;
  let slipsFailed = 0;
  let transfersCount = 0;

  const CONCURRENCY = 6;

  for (const folder of foldersToScan) {
    try {
      const files = await listSlipsInFolder(folder.id);
      const unprocessed = files.filter(f => !isSlipProcessed(f.id));
      slipsSkipped += (files.length - unprocessed.length);

      const chunks = chunkArray(unprocessed, CONCURRENCY);

      for (const chunk of chunks) {
        const chunkTransactions: Transaction[] = [];

        await Promise.all(
          chunk.map(async (file) => {
            try {
              const { base64, mimeType } = await downloadFileAsBase64(file.id);
              const slipData = await analyzeSlipImage(base64, mimeType, folder.account);

              // Ignore non-slip images, QR generation screens, or zero-amount items
              if (!slipData.amount || slipData.amount <= 0) {
                console.log(`[Auto-Sync] Ignored non-slip / zero-amount image: ${file.name}`);
                markSlipProcessed({
                  driveFileId: file.id,
                  account: folder.account,
                  amount: 0,
                  transactionDate: slipData.date,
                  status: 'IGNORED_ZERO',
                });
                return;
              }

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

              chunkTransactions.push(newTx);

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
              console.error(`[Auto-Sync] Error on ${file.name}:`, err.message);
              markSlipProcessed({
                driveFileId: file.id,
                account: folder.account,
                status: 'FAILED',
              });
            }
          })
        );

        if (chunkTransactions.length > 0) {
          await appendTransactionRows(chunkTransactions);
        }
      }
    } catch (err: any) {
      console.error(`[Auto-Sync] Error scanning folder ${folder.account}:`, err.message);
    }
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

import { NextResponse } from 'next/server';
import { listSlipsInFolder, downloadFileAsBase64 } from '@/lib/google/drive';
import { analyzeSlipImage } from '@/lib/ai/gemini-slip-ocr';
import { appendTransactionRows, ensureSheetStructure } from '@/lib/google/sheets';
import { isSlipProcessed, markSlipProcessed } from '@/lib/db/sqlite';
import { SyncStats, Transaction } from '@/types';

// Chunk helper for high-speed parallel processing
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const results: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    results.push(array.slice(i, i + chunkSize));
  }
  return results;
}

export async function POST() {
  try {
    // 1. Ensure sheet tabs & headers exist
    await ensureSheetStructure();

    const kplusFolderId = process.env.GOOGLE_DRIVE_KPLUS_FOLDER_ID;
    const makeFolderId = process.env.GOOGLE_DRIVE_MAKE_FOLDER_ID;
    const paotangFolderId = process.env.GOOGLE_DRIVE_PAOTANG_FOLDER_ID;

    if (!kplusFolderId && !makeFolderId && !paotangFolderId) {
      return NextResponse.json(
        { error: 'No Google Drive slip folders are configured' },
        { status: 400 }
      );
    }

    // Prioritize Make by KBank and Paotang first
    const foldersToScan = [
      { id: makeFolderId, account: 'Make by KBank' },
      { id: paotangFolderId, account: 'เป๋าตัง' },
      { id: kplusFolderId, account: 'K PLUS' },
    ].filter((f): f is { id: string; account: string } => Boolean(f.id));

    const stats: SyncStats = {
      processed: 0,
      skipped: 0,
      failed: 0,
      transfers: 0,
      details: [],
    };

    const CONCURRENCY = 6; // Process 6 slips in parallel

    for (const folder of foldersToScan) {
      console.log(`[Sync] Scanning folder: ${folder.account}...`);
      const files = await listSlipsInFolder(folder.id);

      const unprocessedFiles = files.filter(f => !isSlipProcessed(f.id));
      stats.skipped += (files.length - unprocessedFiles.length);

      console.log(`[Sync] ${folder.account}: ${files.length} total, ${unprocessedFiles.length} new to process`);

      const fileChunks = chunkArray(unprocessedFiles, CONCURRENCY);

      for (const chunk of fileChunks) {
        const chunkTransactions: Transaction[] = [];

        await Promise.all(
          chunk.map(async (file) => {
            try {
              const { base64, mimeType } = await downloadFileAsBase64(file.id);
              const slipData = await analyzeSlipImage(base64, mimeType, folder.account);

              // Ignore non-slip images, QR generation screens, or zero-amount items
              if (!slipData.amount || slipData.amount <= 0) {
                console.log(`[Sync] Ignored non-slip / zero-amount image: ${file.name}`);
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
                stats.transfers++;
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

              stats.processed++;
              stats.details.push({
                fileName: file.name,
                account: folder.account,
                amount: slipData.amount,
                status: 'SUCCESS',
              });
            } catch (err: any) {
              stats.failed++;
              console.error(`[Sync] Error on ${file.name}:`, err.message);
              markSlipProcessed({
                driveFileId: file.id,
                account: folder.account,
                status: 'FAILED',
              });
            }
          })
        );

        // Save batch to Google Sheets periodically
        if (chunkTransactions.length > 0) {
          await appendTransactionRows(chunkTransactions);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `ซิงค์สลิปสำเร็จ: ประมวลผลใหม่ ${stats.processed} สลิป (โอนระหว่างบัญชี ${stats.transfers}), ข้าม ${stats.skipped}, ล้มเหลว ${stats.failed}`,
      stats,
    });
  } catch (error: any) {
    console.error('Error during sync:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync slips' },
      { status: 500 }
    );
  }
}

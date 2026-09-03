import { NextResponse } from 'next/server';
import { listSlipsInFolder, downloadFileAsBase64 } from '@/lib/google/drive';
import { analyzeSlipImage } from '@/lib/ai/gemini-slip-ocr';
import { appendTransactionRows, ensureSheetStructure } from '@/lib/google/sheets';
import { isSlipProcessed, markSlipProcessed } from '@/lib/db/sqlite';
import { SyncStats, Transaction } from '@/types';

export async function POST() {
  try {
    // 1. Ensure sheet tabs & headers exist
    await ensureSheetStructure();

    const kplusFolderId = process.env.GOOGLE_DRIVE_KPLUS_FOLDER_ID;
    const makeFolderId = process.env.GOOGLE_DRIVE_MAKE_FOLDER_ID;

    if (!kplusFolderId && !makeFolderId) {
      return NextResponse.json(
        { error: 'Neither GOOGLE_DRIVE_KPLUS_FOLDER_ID nor GOOGLE_DRIVE_MAKE_FOLDER_ID is configured in environment variables' },
        { status: 400 }
      );
    }

    const foldersToScan = [
      { id: kplusFolderId, account: 'K PLUS' },
      { id: makeFolderId, account: 'Make by KBank' },
    ].filter((f): f is { id: string; account: string } => Boolean(f.id));

    const stats: SyncStats = {
      processed: 0,
      skipped: 0,
      failed: 0,
      transfers: 0,
      details: [],
    };

    const newTransactionsToAppend: Transaction[] = [];

    for (const folder of foldersToScan) {
      const files = await listSlipsInFolder(folder.id);

      for (const file of files) {
        // Skip already processed files immediately from SQLite cache (Zero AI cost)
        if (isSlipProcessed(file.id)) {
          stats.skipped++;
          continue;
        }

        try {
          // Download image
          const { base64, mimeType } = await downloadFileAsBase64(file.id);

          // OCR with Gemini Flash-Lite
          const slipData = await analyzeSlipImage(base64, mimeType, folder.account);

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

          newTransactionsToAppend.push(newTx);

          // Mark in SQLite cache immediately
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
          stats.details.push({
            fileName: file.name,
            account: folder.account,
            status: 'FAILED',
            error: err.message || 'Unknown error processing slip',
          });

          markSlipProcessed({
            driveFileId: file.id,
            account: folder.account,
            status: 'FAILED',
          });
        }
      }
    }

    // 2. High-speed batch append all new transactions to Google Sheets in a single call
    if (newTransactionsToAppend.length > 0) {
      await appendTransactionRows(newTransactionsToAppend);
    }

    return NextResponse.json({
      success: true,
      message: `ซิงค์สลิปสำเร็จ: ประมวลผลใหม่ ${stats.processed} สลิป (โอนระหว่างบัญชี ${stats.transfers}), ข้ามสลิปเดิมที่เคยประมวลผลแล้ว ${stats.skipped}, ล้มเหลว ${stats.failed}`,
      stats,
    });
  } catch (error: any) {
    console.error('Error during sync:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync slips from Google Drive' },
      { status: 500 }
    );
  }
}

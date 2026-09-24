import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { parseStatementPdf, StatementTransaction } from '@/lib/statement/parser';
import { getAllTransactions, appendTransactionRows } from '@/lib/google/sheets';
import { isStatementProcessed, markStatementProcessed } from '@/lib/db';
import { Transaction } from '@/types';

export interface StatementEmailSyncResult {
  success: boolean;
  message: string;
  processedFiles: number;
  skippedFiles: number;
  totalStatementTransactions: number;
  matchedWithSlip: number;
  addedFromStatement: number;
  newTransactions?: Array<{
    date: string;
    amount: number;
    type: string;
    category: string;
    note: string;
  }>;
  skipped?: boolean;
}

/**
 * Synchronizes Kasikornbank e-Statements received via email (from K-ElectronicDocument@kasikornbank.com)
 * Uses Slip-First Deduplication:
 * - If a statement transaction matches an existing slip/transaction on (date, amount, account='K PLUS'),
 *   the slip record remains primary and unchanged.
 * - Only unmatched, statement-exclusive transactions (e.g. interest, fees, direct debit) are added with source='STATEMENT'.
 */
export async function syncStatementsFromEmail(forceRefresh = false): Promise<StatementEmailSyncResult> {
  const user = process.env.GHB_EMAIL_USER || 'worachotw.43@gmail.com';
  const pass = process.env.GHB_EMAIL_APP_PASSWORD;

  if (!pass) {
    console.warn('[Statement Email Sync] GHB_EMAIL_APP_PASSWORD not set, skipping email sync');
    return {
      success: false,
      message: 'ไม่ได้ตั้งค่ารหัสผ่านอีเมล (GHB_EMAIL_APP_PASSWORD)',
      processedFiles: 0,
      skippedFiles: 0,
      totalStatementTransactions: 0,
      matchedWithSlip: 0,
      addedFromStatement: 0,
    };
  }

  const passwordCandidates = [
    process.env.STATEMENT_PASSWORD,
    '15042000',
  ].filter(Boolean) as string[];

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user,
      pass,
    },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      // Search for KBank e-Document emails
      const searchResult = await client.search({
        or: [
          { from: 'K-ElectronicDocument@kasikornbank.com' },
          { subject: 'K-eDocument' },
          { subject: 'E-statement for saving account' },
        ],
      });

      const uids = Array.isArray(searchResult) ? searchResult : [];
      if (uids.length === 0) {
        return {
          success: true,
          message: 'ไม่พบอีเมล e-Statement จากกสิกรไทย',
          processedFiles: 0,
          skippedFiles: 0,
          totalStatementTransactions: 0,
          matchedWithSlip: 0,
          addedFromStatement: 0,
        };
      }

      // 1. Fetch all existing transactions to prepare for Slip-First Deduplication
      const existingTransactions = await getAllTransactions();
      
      // Index existing K PLUS transactions for fast, single-use matching
      // Map of "YYYY-MM-DD_AMOUNT" -> Array of available matching entries
      const slipMatchMap = new Map<string, Array<{ id: string; used: boolean; tx: Transaction }>>();
      for (const tx of existingTransactions) {
        if (tx.account === 'K PLUS' || !tx.account) {
          const key = `${tx.date}_${tx.amount.toFixed(2)}`;
          if (!slipMatchMap.has(key)) {
            slipMatchMap.set(key, []);
          }
          slipMatchMap.get(key)!.push({ id: tx.id, used: false, tx });
        }
      }

      let processedFiles = 0;
      let skippedFiles = 0;
      let totalStatementTransactions = 0;
      let matchedWithSlip = 0;
      let addedFromStatement = 0;
      const allNewTransactions: Transaction[] = [];

      // Sort UIDs descending to process most recent statements first
      const sortedUids = [...uids].sort((a, b) => b - a);

      for (const uid of sortedUids) {
        try {
          const { content } = await client.download(String(uid));
          const parsed = await simpleParser(content);

          if (!parsed.attachments || parsed.attachments.length === 0) continue;

          for (const att of parsed.attachments) {
            const filename = att.filename || '';
            const isStatementPdf = filename.toLowerCase().endsWith('.pdf') && 
              (filename.startsWith('STM_') || filename.toLowerCase().includes('statement'));

            if (!isStatementPdf) continue;

            const fileId = `email_stm_${filename}`;

            // Check if already processed
            if (!forceRefresh) {
              const alreadyProcessed = await isStatementProcessed(fileId);
              if (alreadyProcessed) {
                skippedFiles++;
                continue;
              }
            }

            // Parse PDF with password candidates
            let statementTxs: StatementTransaction[] = [];
            for (const pw of passwordCandidates) {
              try {
                statementTxs = parseStatementPdf(att.content, pw);
                if (statementTxs.length > 0) break;
              } catch {
                // Try next password
              }
            }

            if (statementTxs.length === 0) {
              console.warn(`[Statement Email Sync] Could not parse transactions from ${filename}`);
              continue;
            }

            totalStatementTransactions += statementTxs.length;

            // Slip-First Deduplication for each transaction in the statement
            for (const stm of statementTxs) {
              const key = `${stm.date}_${stm.amount.toFixed(2)}`;
              const availableSlips = slipMatchMap.get(key) || [];
              const matchedEntry = availableSlips.find(e => !e.used);

              if (matchedEntry) {
                // MATCHED WITH SLIP!
                // Keep the slip record intact in Google Sheets as primary.
                matchedEntry.used = true;
                matchedWithSlip++;
              } else {
                // UNMATCHED: Statement-exclusive transaction (e.g. interest, bank fee, direct debit)
                const txId = `stm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                const newTx: Transaction = {
                  id: txId,
                  date: stm.date,
                  time: stm.time,
                  type: stm.type,
                  amount: stm.amount,
                  category: stm.category || 'อื่นๆ',
                  account: 'K PLUS',
                  note: stm.details || stm.typeDesc || 'KBank e-Statement',
                  source: 'STATEMENT',
                  createdAt: new Date().toISOString(),
                };

                allNewTransactions.push(newTx);
                addedFromStatement++;

                // Add to match map so internal statement duplicates don't double-add
                if (!slipMatchMap.has(key)) {
                  slipMatchMap.set(key, []);
                }
                slipMatchMap.get(key)!.push({ id: txId, used: true, tx: newTx });
              }
            }

            // Mark this statement file as processed in DB
            await markStatementProcessed({
              fileId,
              fileName: filename,
              modifiedTime: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
              transactionsCount: statementTxs.length,
            });

            processedFiles++;
          }
        } catch (err: any) {
          console.error(`[Statement Email Sync] Error processing message UID ${uid}:`, err.message);
        }
      }

      // Append all genuinely new statement transactions to Google Sheets
      if (allNewTransactions.length > 0) {
        await appendTransactionRows(allNewTransactions);
      }

      const msg = processedFiles > 0
        ? `ซิงค์ e-Statement สำเร็จ: ตรวจพบ ${processedFiles} ไฟล์, รายการตรงกับสลิป ${matchedWithSlip} รายการ (ใช้สลิปเป็นหลัก), บันทึกรายการใหม่เฉพาะ Statement ${addedFromStatement} รายการ`
        : skippedFiles > 0
        ? `e-Statement เป็นปัจจุบันแล้ว (ข้าม ${skippedFiles} ไฟล์ที่เคยประมวลผลแล้ว)`
        : 'ไม่พบไฟล์ e-Statement ใหม่';

      return {
        success: true,
        message: msg,
        processedFiles,
        skippedFiles,
        totalStatementTransactions,
        matchedWithSlip,
        addedFromStatement,
        skipped: processedFiles === 0 && skippedFiles > 0,
        newTransactions: allNewTransactions.map(tx => ({
          date: tx.date,
          amount: tx.amount,
          type: tx.type,
          category: tx.category,
          note: tx.note,
        })),
      };
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (error: any) {
    console.error('[Statement Email Sync] IMAP error:', error);
    return {
      success: false,
      message: `เกิดข้อผิดพลาดในการเชื่อมต่ออีเมล: ${error.message || error}`,
      processedFiles: 0,
      skippedFiles: 0,
      totalStatementTransactions: 0,
      matchedWithSlip: 0,
      addedFromStatement: 0,
    };
  }
}

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { getGoogleAuth } from '@/lib/google/auth';
import { getSpreadsheetId, getSheetsClient } from '@/lib/google/sheets';

export interface StatementTransaction {
  date: string;
  time: string;
  typeDesc: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  amount: number;
  category: string;
  channel: string;
  details: string;
  balance?: number;
}

export function parseStatementPdf(pdfBuffer: Buffer, password?: string): StatementTransaction[] {
  const tempDir = path.join(process.cwd(), 'data', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFilePath = path.join(tempDir, `stm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.pdf`);
  fs.writeFileSync(tempFilePath, pdfBuffer);

  try {
    const pwArg = password ? `-upw ${password}` : '';
    const stdout = execSync(`pdftotext -layout ${pwArg} "${tempFilePath}" -`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    return parseStatementText(stdout);
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

export function parseStatementText(text: string): StatementTransaction[] {
  const lines = text.split('\n');
  const transactions: StatementTransaction[] = [];
  let currentTx: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^\s*(\d{2}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+([^\d\s][^\d]+?)\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s+(.+)$/);

    if (match) {
      if (currentTx) {
        transactions.push(finalizeTx(currentTx));
      }

      const [d, m, y] = match[1].split('-');
      const fullYear = parseInt(y, 10) < 50 ? '20' + y : '19' + y;
      const formattedDate = `${fullYear}-${m}-${d}`;
      const time = `${match[2]}:00`;
      const typeDesc = match[3].trim();
      const val1 = match[4] ? parseFloat(match[4].replace(/,/g, '')) : null;
      const val2 = match[5] ? parseFloat(match[5].replace(/,/g, '')) : null;
      const balance = match[6] ? parseFloat(match[6].replace(/,/g, '')) : undefined;
      const rest = match[7].trim();

      let withdrawal: number | null = null;
      let deposit: number | null = null;
      if (val1 !== null && val2 !== null) {
        withdrawal = val1;
        deposit = val2;
      } else if (val1 !== null && val2 === null) {
        if (typeDesc.includes('รับ') || typeDesc.includes('ฝาก') || typeDesc.includes('ดอกเบี้ย')) {
          deposit = val1;
        } else {
          withdrawal = val1;
        }
      }

      currentTx = {
        date: formattedDate,
        time,
        typeDesc,
        withdrawal,
        deposit,
        balance,
        rawRest: rest,
      };
    } else if (currentTx && /^\s{60,}\S/.test(line)) {
      currentTx.rawRest += ' ' + line.trim();
    }
  }

  if (currentTx) {
    transactions.push(finalizeTx(currentTx));
  }

  return transactions;
}

function finalizeTx(raw: any): StatementTransaction {
  const isDeposit = raw.deposit !== null && raw.deposit > 0;
  const amount = isDeposit ? raw.deposit : (raw.withdrawal || 0);

  const ownNamesConfig = process.env.OWN_ACCOUNT_NAMES || 'วรโชติ,worachot';
  const ownNames = ownNamesConfig.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const detailText = `${raw.typeDesc} ${raw.rawRest}`.toLowerCase();
  let isSelf = false;
  for (const name of ownNames) {
    if (detailText.includes(name)) {
      isSelf = true;
      break;
    }
  }

  let type: 'EXPENSE' | 'INCOME' | 'TRANSFER' = isDeposit ? 'INCOME' : 'EXPENSE';
  if (isSelf) {
    type = 'TRANSFER';
  }

  const category = categorizeStatementRow(raw.typeDesc, raw.rawRest, type);

  return {
    date: raw.date,
    time: raw.time,
    typeDesc: raw.typeDesc,
    type,
    amount,
    category,
    channel: 'K PLUS',
    details: `${raw.typeDesc}: ${raw.rawRest}`,
    balance: raw.balance,
  };
}

function categorizeStatementRow(txDesc: string, rest: string, type: 'EXPENSE' | 'INCOME' | 'TRANSFER'): string {
  if (type === 'TRANSFER') return 'โอนระหว่างบัญชี';
  if (type === 'INCOME') return 'เงินเดือน/รายรับ';

  const text = `${txDesc} ${rest}`.toLowerCase();
  if (/shopee|lazada|tiktok|เครื่องรูดบัตร|edc/i.test(text)) return 'ช้อปปิ้ง';
  if (/ปตท|ptt|บางจาก|shell|caltex|น้ำมัน|ทางด่วน/i.test(text)) return 'การเดินทาง/ค่าน้ำมัน';
  if (/เซเว่น|7-eleven|cj express|lotus|โลตัส|big c|บิ๊กซี|central food/i.test(text)) return 'ของใช้ในบ้าน/ซูเปอร์';
  if (/ไฟฟ้า|ประปา|ais|true|dtac|เน็ต|3bb|nt/i.test(text)) return 'สาธารณูปโภค (น้ำ/ไฟ/เน็ต)';
  if (/อาหาร|กาแฟ|cafe|amazon|ข้าวมันไก่|กะเพรา|ชา|มณี shop/i.test(text)) return 'อาหารและเครื่องดื่ม';
  if (/ยา|คลินิก|โรงพยาบาล|health|medical/i.test(text)) return 'สุขภาพ/ยา';
  return 'อื่นๆ';
}

/**
 * Reconciles and synchronizes statement PDFs from Google Drive with Google Sheets
 */
export async function syncStatementsFromDrive() {
  const folderId = process.env.GOOGLE_DRIVE_STATEMENT_FOLDER_ID;
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_STATEMENT_FOLDER_ID is not set');
  }

  const password = process.env.STATEMENT_PASSWORD || '15042000';

  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  // 1. List PDF files in statement folder (exclude guide files like channel_bankuse)
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType = 'application/pdf' and trashed = false`,
    fields: 'files(id, name)',
  });

  const files = (res.data.files || []).filter(f => f.name && f.name.startsWith('STM_'));

  if (files.length === 0) {
    return { success: true, message: 'ไม่พบไฟล์ e-Statement ใหม่ใน Google Drive', total: 0 };
  }

  // 2. Fetch existing Google Sheet rows
  const sheetRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'📝 รายการทั้งหมด'!A2:K`,
  });
  const existingRows = sheetRes.data.values || [];

  const existingSlipMap = new Map<string, { slipUrl: string; id: string; driveFileId: string }>();
  for (const row of existingRows) {
    const rDate = row[0];
    const rAmount = parseFloat(String(row[3] || '0').replace(/[^\d.-]/g, ''));
    const rSlip = row[7];
    const rId = row[8];
    const rFileId = row[9];
    if (rDate && !isNaN(rAmount)) {
      const key = `${rDate}_${rAmount.toFixed(2)}`;
      existingSlipMap.set(key, { slipUrl: rSlip, id: rId, driveFileId: rFileId });
    }
  }

  // 3. Download & parse all statement files
  const allTransactions: StatementTransaction[] = [];
  for (const file of files) {
    const fileRes = await drive.files.get(
      { fileId: file.id!, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    const buffer = Buffer.from(fileRes.data as ArrayBuffer);
    const txs = parseStatementPdf(buffer, password);
    allTransactions.push(...txs);
  }

  // 4. Construct reconciled rows
  const finalRows: any[][] = [];
  for (let i = 0; i < allTransactions.length; i++) {
    const stm = allTransactions[i];
    let typeLabel = '🔴 รายจ่าย';
    if (stm.type === 'INCOME') typeLabel = '🟢 รายรับ';
    else if (stm.type === 'TRANSFER') typeLabel = '🔄 โอนย้ายเงิน';

    const key = `${stm.date}_${stm.amount.toFixed(2)}`;
    const matchedSlip = existingSlipMap.get(key);

    const slipFormula = matchedSlip && matchedSlip.slipUrl && matchedSlip.slipUrl !== '-'
      ? matchedSlip.slipUrl
      : '-';

    const txId = matchedSlip && matchedSlip.id ? matchedSlip.id : `stm_${stm.date.replace(/-/g, '')}_${i + 1}`;
    const driveFileId = matchedSlip && matchedSlip.driveFileId ? matchedSlip.driveFileId : '';
    const source = matchedSlip ? 'AUTO_SYNC+STATEMENT' : 'STATEMENT';

    finalRows.push([
      stm.date,
      stm.time,
      typeLabel,
      stm.amount,
      stm.category,
      stm.channel,
      stm.details,
      slipFormula,
      txId,
      driveFileId,
      source,
    ]);
  }

  // Sort descending by date & time
  finalRows.sort((a, b) => {
    const dtA = `${a[0]} ${a[1]}`;
    const dtB = `${b[0]} ${b[1]}`;
    return dtB.localeCompare(dtA);
  });

  // Write back to Google Sheets
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'📝 รายการทั้งหมด'!A2:K`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'📝 รายการทั้งหมด'!A2:K${finalRows.length + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: finalRows,
    },
  });

  return {
    success: true,
    message: `ซิงค์และกระทบยอด Statement สำเร็จทั้งหมด ${finalRows.length} รายการ (จาก ${files.length} ไฟล์)`,
    total: finalRows.length,
    filesCount: files.length,
  };
}

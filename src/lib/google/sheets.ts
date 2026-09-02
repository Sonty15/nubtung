import { google } from 'googleapis';
import { getGoogleAuth } from './auth';
import { Transaction, TransactionType } from '@/types';

const TRANSACTIONS_SHEET = '📝 รายการทั้งหมด';
const SUMMARY_SHEET = '📊 สรุปยอด';
const CATEGORIES_SHEET = '🏷️ หมวดหมู่';

const DEFAULT_CATEGORIES = [
  'อาหารและเครื่องดื่ม',
  'ของใช้ในบ้าน/ซูเปอร์',
  'การเดินทาง/ค่าน้ำมัน',
  'ช้อปปิ้ง',
  'สาธารณูปโภค (น้ำ/ไฟ/เน็ต)',
  'บันเทิง/สตรีมมิ่ง',
  'สุขภาพ/ยา',
  'โอนระหว่างบัญชี',
  'เงินเดือน/รายรับ',
  'อื่นๆ',
];

export async function getSheetsClient() {
  const auth = getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

export function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    throw new Error('GOOGLE_SHEET_ID is not configured in environment variables');
  }
  return id;
}

/**
 * Initializes the Google Sheet with tabs, human-readable headers, and default categories if not already present.
 */
export async function ensureSheetStructure() {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = metadata.data.sheets?.map(s => s.properties?.title) || [];

  const requests: any[] = [];

  // Add sheets if missing
  if (!existingSheets.includes(SUMMARY_SHEET)) {
    requests.push({ addSheet: { properties: { title: SUMMARY_SHEET } } });
  }
  if (!existingSheets.includes(TRANSACTIONS_SHEET)) {
    requests.push({ addSheet: { properties: { title: TRANSACTIONS_SHEET } } });
  }
  if (!existingSheets.includes(CATEGORIES_SHEET)) {
    requests.push({ addSheet: { properties: { title: CATEGORIES_SHEET } } });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  // Populate Transactions header if empty
  const txHeaderCheck = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${TRANSACTIONS_SHEET}'!A1:K1`,
  });

  if (!txHeaderCheck.data.values || txHeaderCheck.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${TRANSACTIONS_SHEET}'!A1:K1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            'วันที่',
            'เวลา',
            'ประเภท',
            'จำนวนเงิน',
            'หมวดหมู่',
            'บัญชี',
            'รายละเอียด / ร้านค้า',
            'สลิป',
            'รหัสรายการ',
            'Drive File ID',
            'ที่มา',
          ],
        ],
      },
    });
  }

  // Populate Categories if empty
  const catCheck = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${CATEGORIES_SHEET}'!A1:A`,
  });

  if (!catCheck.data.values || catCheck.data.values.length === 0) {
    const categoryRows = [['ชื่อหมวดหมู่'], ...DEFAULT_CATEGORIES.map(cat => [cat])];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${CATEGORIES_SHEET}'!A1:A${categoryRows.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: categoryRows },
    });
  }
}

/**
 * Appends a new transaction row to Google Sheets
 */
export async function appendTransactionRow(tx: Transaction) {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  // Create human friendly emoji prefix for type
  let typeLabel: string = tx.type;
  if (tx.type === 'EXPENSE') typeLabel = '🔴 รายจ่าย';
  else if (tx.type === 'INCOME') typeLabel = '🟢 รายรับ';
  else if (tx.type === 'TRANSFER') typeLabel = '🔄 โอนย้ายเงิน';

  // Format slip link formula for easy viewing in Google Sheets app
  const slipFormula = tx.slipUrl
    ? `=HYPERLINK("${tx.slipUrl}", "🖼️ ดูสลิป")`
    : '-';

  const row = [
    tx.date,
    tx.time,
    typeLabel,
    tx.amount,
    tx.category,
    tx.account,
    tx.note,
    slipFormula,
    tx.id,
    tx.driveFileId || '',
    tx.source,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${TRANSACTIONS_SHEET}'!A:K`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row],
    },
  });
}

/**
 * Reads all transaction rows from the Google Sheet
 */
export async function getAllTransactions(): Promise<Transaction[]> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${TRANSACTIONS_SHEET}'!A2:K`,
  });

  const rows = response.data.values || [];
  const transactions: Transaction[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0 || !r[0]) continue;

    const rawType = r[2] || '';
    let parsedType: TransactionType = 'EXPENSE';
    if (rawType.includes('รายรับ') || rawType === 'INCOME') parsedType = 'INCOME';
    else if (rawType.includes('โอนย้าย') || rawType === 'TRANSFER') parsedType = 'TRANSFER';

    // Parse amount cleanly
    const rawAmount = String(r[3] || '0').replace(/[^\d.-]/g, '');
    const amount = parseFloat(rawAmount) || 0;

    transactions.push({
      id: r[8] || `tx_${i + 1}`,
      date: r[0] || '',
      time: r[1] || '',
      type: parsedType,
      amount,
      category: r[4] || 'อื่นๆ',
      account: r[5] || 'ไม่ระบุ',
      note: r[6] || '',
      slipUrl: r[7] ? String(r[7]).replace(/.*"(.*)".*/, '$1') : undefined,
      driveFileId: r[9] || undefined,
      source: (r[10] as any) || 'MANUAL',
      createdAt: `${r[0]}T${r[1] || '00:00:00'}`,
    });
  }

  // Sort descending by date & time
  transactions.sort((a, b) => {
    const dtA = `${a.date} ${a.time}`;
    const dtB = `${b.date} ${b.time}`;
    return dtB.localeCompare(dtA);
  });

  return transactions;
}

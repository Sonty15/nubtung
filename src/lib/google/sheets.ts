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

  // Populate Summary sheet if empty
  const summaryCheck = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SUMMARY_SHEET}'!A1:A5`,
  });

  if (!summaryCheck.data.values || summaryCheck.data.values.length === 0) {
    const summaryRows = [
      ['📊 สรุปภาพรวมการเงิน (Financial Summary)', '', ''],
      ['อัปเดตอัตโนมัติแบบ Real-time เชื่อมต่อกับทุกรายการ', '', ''],
      ['', '', ''],
      ['💰 ภาพรวมกระแสเงินสด', 'จำนวนเงิน (บาท)', ''],
      ['🟢 รายรับทั้งหมด (Total Income)', "='📝 รายการทั้งหมด'!C:C", ''],
      ['🔴 รายจ่ายทั้งหมด (Total Expense)', "='📝 รายการทั้งหมด'!C:C", ''],
      ['💰 คงเหลือสุทธิ (Net Balance)', '=B5-B6', ''],
      ['🔄 เงินโอนระหว่างบัญชี (Transfers)', "='📝 รายการทั้งหมด'!C:C", ''],
      ['', '', ''],
      ['🏦 สรุปรายจ่ายแยกตามบัญชี', 'จำนวนเงิน (บาท)', 'สัดส่วน %'],
      ['🔵 K PLUS', '=SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!F:F, "K PLUS") + SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!F:F, "*กสิกร*")', '=B11/B6'],
      ['🟡 Make by KBank', '=SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!F:F, "Make by KBank") + SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!F:F, "*Make*")', '=B12/B6'],
      ['📲 เป๋าตัง (Paotang)', '=SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!F:F, "เป๋าตัง") + SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!F:F, "*Paotang*")', '=B13/B6'],
      ['💵 เงินสด (Cash)', '=SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!F:F, "เงินสด") + SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!F:F, "*Cash*")', '=B14/B6'],
      ['', '', ''],
      ['🏷️ สรุปค่าใช้จ่ายแยกตามหมวดหมู่', 'ยอดรวม (บาท)', 'สัดส่วน %'],
      ['อาหารและเครื่องดื่ม', '=SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!E:E, A17)', '=B17/B6'],
      ['ของใช้ในบ้าน/ซูเปอร์', '=SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!E:E, A18)', '=B18/B6'],
      ['การเดินทาง/ค่าน้ำมัน', '=SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!E:E, A19)', '=B19/B6'],
      ['ช้อปปิ้ง', '=SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!E:E, A20)', '=B20/B6'],
      ['สาธารณูปโภค (น้ำ/ไฟ/เน็ต)', '=SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!E:E, A21)', '=B21/B6'],
      ['บันเทิง/สตรีมมิ่ง', '=SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!E:E, A22)', '=B22/B6'],
      ['สุขภาพ/ยา', '=SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!E:E, A23)', '=B23/B6'],
      ['อื่นๆ', '=SUMIFS(\'📝 รายการทั้งหมด\'!D:D, \'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!E:E, A24)', '=B24/B6'],
    ];

    summaryRows[4][1] = '=SUMIF(\'📝 รายการทั้งหมด\'!C:C, "*รายรับ*", \'📝 รายการทั้งหมด\'!D:D)';
    summaryRows[5][1] = '=SUMIF(\'📝 รายการทั้งหมด\'!C:C, "*รายจ่าย*", \'📝 รายการทั้งหมด\'!D:D)';
    summaryRows[7][1] = '=SUMIF(\'📝 รายการทั้งหมด\'!C:C, "*โอนย้าย*", \'📝 รายการทั้งหมด\'!D:D)';

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${SUMMARY_SHEET}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: summaryRows },
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
 * Appends multiple transaction rows in a single batch API call
 */
export async function appendTransactionRows(txs: Transaction[]) {
  if (txs.length === 0) return;

  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const rows = txs.map(tx => {
    let typeLabel: string = tx.type;
    if (tx.type === 'EXPENSE') typeLabel = '🔴 รายจ่าย';
    else if (tx.type === 'INCOME') typeLabel = '🟢 รายรับ';
    else if (tx.type === 'TRANSFER') typeLabel = '🔄 โอนย้ายเงิน';

    const slipFormula = tx.slipUrl
      ? `=HYPERLINK("${tx.slipUrl}", "🖼️ ดูสลิป")`
      : '-';

    return [
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
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${TRANSACTIONS_SHEET}'!A:K`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: rows,
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

    let slipUrl: string | undefined = undefined;
    if (r[7] && String(r[7]).startsWith('http')) {
      slipUrl = String(r[7]);
    } else if (r[9] && String(r[9]).trim().length > 10) {
      slipUrl = `https://drive.google.com/file/d/${String(r[9]).trim()}/view`;
    }

    transactions.push({
      id: r[8] || `tx_${i + 1}`,
      date: r[0] || '',
      time: r[1] || '',
      type: parsedType,
      amount,
      category: r[4] || 'อื่นๆ',
      account: r[5] || 'ไม่ระบุ',
      note: r[6] || '',
      slipUrl,
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

/**
 * Deletes a transaction row from Google Sheets by transaction ID
 */
export async function deleteTransactionRow(txId: string): Promise<boolean> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  const txSheet = metadata.data.sheets?.find(s => s.properties?.title === TRANSACTIONS_SHEET);
  if (!txSheet || txSheet.properties?.sheetId === undefined) return false;
  const sheetId = txSheet.properties.sheetId;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${TRANSACTIONS_SHEET}'!I2:I`,
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex(r => (r[0] || '').trim() === txId.trim());

  if (rowIndex === -1) {
    return false;
  }

  // Row 2 in sheets corresponds to startRowIndex: 1 (0-indexed)
  const actualRowIndex = rowIndex + 1;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: actualRowIndex,
              endIndex: actualRowIndex + 1,
            },
          },
        },
      ],
    },
  });

  return true;
}

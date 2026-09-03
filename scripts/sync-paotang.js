const { google } = require('googleapis');
const { GoogleGenAI } = require('@google/genai');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'nubtang.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let key = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
const auth = new google.auth.JWT({
  email,
  key,
  scopes: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.GOOGLE_SHEET_ID;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function runPaotangSync() {
  const folderId = process.env.GOOGLE_DRIVE_PAOTANG_FOLDER_ID || '1TQH7jGytIhdS05IhFxGuMUj8n1vZAx3g';
  console.log(`[Paotang Sync] 🔍 Scanning folder ${folderId}...`);

  const processedSlips = new Set(
    db.prepare('SELECT drive_file_id FROM processed_slips').all().map(r => r.drive_file_id)
  );

  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: 'files(id, name, mimeType, webViewLink, createdTime)',
    pageSize: 100,
  });

  const files = (res.data.files || []).filter(f => !processedSlips.has(f.id));
  console.log(`[Paotang Sync] 🚀 Found ${files.length} unprocessed Paotang slips to process...`);

  if (files.length === 0) {
    console.log('[Paotang Sync] ✅ All Paotang slips already processed!');
    return;
  }

  const prompt = `
You are an expert Thai banking slip OCR assistant.
Analyze this Thai bank slip image from เป๋าตัง (Paotang / G-Wallet).

Special Rules for เป๋าตัง (Paotang / G-Wallet) slips:
1. Government Co-Pay / Subsidy: If the slip contains government co-pay / subsidy (e.g. คนละครึ่ง, เราชนะ, รัฐช่วยจ่าย, สิทธิประโยชน์):
   - The 'amount' MUST STRICTLY be ONLY the actual money paid by the user / deducted from G-Wallet (เช่น 'หักจาก G-Wallet', 'ผู้ซื้อจ่าย', 'ยอดเงินที่ชำระจริง').
   - DO NOT use the total price before discount or the government subsidy amount.
2. If the image is a QR Code generation screen for receiving money (e.g. THAI QR PAYMENT / PromptPay QR showing the user's name/account to receive funds):
   - Set "isReceiveQrOrRequest": true
   - Set "amount": 0

Extract the following information:
- isReceiveQrOrRequest: boolean
- amount: number (pure number)
- date: "YYYY-MM-DD" (Gregorian)
- time: "HH:mm:ss"
- receiverName: string (store/merchant/receiver)
- suggestedCategory: "อาหารและเครื่องดื่ม" | "ของใช้ในบ้าน/ซูเปอร์" | "การเดินทาง/ค่าน้ำมัน" | "ช้อปปิ้ง" | "สาธารณูปโภค (น้ำ/ไฟ/เน็ต)" | "อื่นๆ"
- note: string

Output strictly JSON:
{
  "isReceiveQrOrRequest": boolean,
  "amount": number,
  "date": "YYYY-MM-DD",
  "time": "HH:mm:ss",
  "receiverName": "string",
  "suggestedCategory": "string",
  "note": "string"
}
`;

  const markProcessedStmt = db.prepare(`
    INSERT OR REPLACE INTO processed_slips (drive_file_id, account, amount, transaction_date, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  const pendingRows = [];

  for (const file of files) {
    try {
      const fileRes = await drive.files.get(
        { fileId: file.id, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      const base64 = Buffer.from(fileRes.data).toString('base64');
      const mimeType = file.mimeType || 'image/png';

      const aiRes = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [
          { role: 'user', parts: [{ text: prompt }, { inlineData: { data: base64, mimeType } }] }
        ]
      });

      const raw = aiRes.text?.trim() || '{}';
      const cleaned = raw.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.isReceiveQrOrRequest || !parsed.amount || Number(parsed.amount) <= 0) {
        console.log(`[Paotang Sync] 🚫 Ignored Receive QR screen / 0 amount: ${file.name}`);
        markProcessedStmt.run(file.id, 'เป๋าตัง', 0, parsed.date || '', 'IGNORED_ZERO');
        continue;
      }

      const amount = Number(parsed.amount);
      const date = parsed.date || new Date().toISOString().split('T')[0];
      const time = parsed.time || '12:00:00';
      const category = parsed.suggestedCategory || 'อาหารและเครื่องดื่ม';
      const note = parsed.note || parsed.receiverName || 'สลิปเป๋าตัง';
      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const slipLink = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;

      pendingRows.push([
        date,
        time,
        '🔴 รายจ่าย',
        amount,
        category,
        'เป๋าตัง',
        note,
        slipLink,
        txId,
        file.id,
        'AUTO_SYNC',
      ]);

      markProcessedStmt.run(file.id, 'เป๋าตัง', amount, date, 'SUCCESS');
      console.log(`[Paotang Sync] ✅ Processed: ${date} ${time} | ฿${amount} | ${category} | ${note}`);
    } catch (err) {
      console.error(`[Paotang Sync] ❌ Error on ${file.name}:`, err.message);
      markProcessedStmt.run(file.id, 'เป๋าตัง', 0, '', 'FAILED');
    }
  }

  if (pendingRows.length > 0) {
    console.log(`[Paotang Sync] 📝 Appending ${pendingRows.length} rows to Google Sheets...`);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "'📝 รายการทั้งหมด'!A:K",
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: pendingRows },
    });
    console.log('[Paotang Sync] 🎉 Done appending to Google Sheets!');
  }
}

runPaotangSync().catch(console.error);

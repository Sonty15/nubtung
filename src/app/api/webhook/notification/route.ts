import { NextResponse } from 'next/server';
import { appendTransactionRow, ensureSheetStructure } from '@/lib/google/sheets';
import { getDb } from '@/lib/db/sqlite';
import { Transaction, TransactionType } from '@/types';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let payload: any = {};

    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = { text: rawBody };
    }

    const messageText = payload.text || payload.message || payload.notification || rawBody;
    if (!messageText || typeof messageText !== 'string' || messageText.trim().length === 0) {
      return NextResponse.json({ error: 'Empty message text' }, { status: 400 });
    }

    const text = messageText.trim();

    // 1. Extract Amount
    // Matches formats: "500.00 บาท", "500.00บาท", "จำนวน 500.00", "500 บาท", "500.00"
    const amountMatch = text.match(/(?:จำนวน|ยอดเงิน|เงินเข้า|เงินออก|ชำระ|โอน)?\s*([\d,]+\.?\d*)\s*(?:บาท|THB)?/i);
    let amount = 0;
    if (amountMatch && amountMatch[1]) {
      const cleanNum = amountMatch[1].replace(/,/g, '');
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
      }
    }

    // Fallback search for floating number if first match failed
    if (amount === 0) {
      const numMatch = text.match(/[\d,]+\.\d{2}/);
      if (numMatch) {
        amount = parseFloat(numMatch[0].replace(/,/g, '')) || 0;
      }
    }

    if (amount === 0) {
      return NextResponse.json({
        skipped: true,
        message: 'Could not extract a valid amount from notification',
        text,
      });
    }

    // 2. Identify Account (K PLUS vs Make by KBank)
    const kplusFull = process.env.KPLUS_ACCOUNT_NO || '0568966651';
    const makeFull = process.env.MAKE_ACCOUNT_NO || '1183962996';
    const kplusLast4 = kplusFull.slice(-4); // 6665
    const makeLast4 = makeFull.slice(-4);   // 6299

    let account = 'K PLUS';
    const hasKplus = text.includes(kplusLast4) || text.includes(kplusFull);
    const hasMake = text.includes(makeLast4) || text.includes(makeFull) || /make/i.test(text);

    if (hasMake && !hasKplus) {
      account = 'Make by KBank';
    } else if (hasKplus) {
      account = 'K PLUS';
    }

    // 3. Self-Transfer Detection (โอนเงินระหว่าง 2 บัญชีนี้)
    const ownNamesConfig = process.env.OWN_ACCOUNT_NAMES || 'วรโชติ,worachot';
    const ownNames = ownNamesConfig.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    const isSelfName = ownNames.some(name => text.toLowerCase().includes(name));
    const isBothAccounts = hasKplus && hasMake;
    const isSelfTransfer = isBothAccounts || isSelfName;

    // Determine Transaction Type
    let type: TransactionType = 'EXPENSE';
    const isIncomeText = /เงินเข้า|รับโอน|ฝากเงิน|credit|deposit/i.test(text);
    const isExpenseText = /เงินออก|โอนเงิน|ชำระ|จ่าย|debit|withdraw/i.test(text);

    if (isSelfTransfer) {
      type = 'TRANSFER';
    } else if (isIncomeText) {
      type = 'INCOME';
    } else if (isExpenseText) {
      type = 'EXPENSE';
    }

    // 4. Deduplicate Transfers (KBank Live sends 2 notifications for 1 transfer: 1 out from KBank and 1 in to Make)
    const db = getDb();
    if (type === 'TRANSFER') {
      const recentTransfer = db.prepare(`
        SELECT drive_file_id FROM processed_slips 
        WHERE amount = ? AND status = 'TRANSFER_SUCCESS' AND created_at >= datetime('now', '-3 minutes')
      `).get(amount);

      if (recentTransfer) {
        return NextResponse.json({
          success: true,
          message: `รายการโอนย้ายเงิน ฿${amount} ถูกบันทึกไปแล้วจากแจ้งเตือนแรก (ข้ามการบันทึกซ้ำอัตโนมัติ)`,
          skippedDuplicate: true,
        });
      }
    }

    // 5. Categorize
    let category = 'อื่นๆ';
    if (type === 'TRANSFER') {
      category = 'โอนระหว่างบัญชี';
    } else if (type === 'INCOME') {
      category = 'เงินเดือน/รายรับ';
    } else {
      const lower = text.toLowerCase();
      if (/shopee|lazada|tiktok|edc/i.test(lower)) category = 'ช้อปปิ้ง';
      else if (/ปตท|ptt|บางจาก|shell|น้ำมัน|ทางด่วน/i.test(lower)) category = 'การเดินทาง/ค่าน้ำมัน';
      else if (/เซเว่น|7-eleven|lotus|big c|cj/i.test(lower)) category = 'ของใช้ในบ้าน/ซูเปอร์';
      else if (/ไฟฟ้า|ประปา|ais|true|dtac|เน็ต/i.test(lower)) category = 'สาธารณูปโภค (น้ำ/ไฟ/เน็ต)';
      else if (/อาหาร|กาแฟ|cafe|amazon|กะเพรา/i.test(lower)) category = 'อาหารและเครื่องดื่ม';
    }

    // 6. Format Date & Time
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    const txId = `noti_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newTx: Transaction = {
      id: txId,
      date: dateStr,
      time: timeStr,
      type,
      amount,
      category,
      account,
      note: `LINE แจ้งเตือน: ${text.substring(0, 80)}`,
      source: 'AUTO_SYNC',
      createdAt: now.toISOString(),
    };

    // Ensure sheet structure and append
    await ensureSheetStructure();
    await appendTransactionRow(newTx);

    // Record in SQLite cache for deduplication
    if (type === 'TRANSFER') {
      db.prepare(`
        INSERT INTO processed_slips (drive_file_id, account, amount, transaction_date, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(txId, account, amount, dateStr, 'TRANSFER_SUCCESS');
    }

    return NextResponse.json({
      success: true,
      message: `บันทึกรายการสำเร็จ: ${type === 'INCOME' ? '🟢 รายรับ' : type === 'TRANSFER' ? '🔄 โอนย้าย' : '🔴 รายจ่าย'} ฿${amount} (${account})`,
      transaction: newTx,
    });
  } catch (error: any) {
    console.error('Notification Webhook Error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

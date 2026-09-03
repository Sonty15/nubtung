import { GoogleGenAI } from '@google/genai';
import { SlipAnalysisResult, TransactionType } from '@/types';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }
  return new GoogleGenAI({ apiKey });
}

export async function analyzeSlipImage(
  base64Image: string,
  mimeType: string,
  accountContext: string
): Promise<SlipAnalysisResult> {
  const ai = getGeminiClient();

  const isMakeAccount = accountContext.toLowerCase().includes('make');
  const isPaotangAccount = accountContext.toLowerCase().includes('เป๋าตัง') || accountContext.toLowerCase().includes('paotang');

  const prompt = `
You are an expert Thai banking slip OCR assistant.
Analyze this Thai bank slip image (from bank / account: ${accountContext}).

${isMakeAccount ? `
Special Rules for Make by KBank slips:
Make by KBank uses distinct Cloud Pocket theme colors to represent spending categories.
Identify the primary theme/pocket color of the slip banner or header:
- Orange (สีส้ม) -> Category: 'อาหารและเครื่องดื่ม'
- Red (สีแดง) -> Category: 'ช้อปปิ้ง'
- Yellow (สีเหลือง) -> Category: 'การเดินทาง/ค่าน้ำมัน' (น้ำมัน)
- Dark Green (สีเขียวเข้ม) -> Category: 'การเดินทาง/ค่าน้ำมัน' (เดินทาง/รถ)
- Pink (สีชมพู) -> Category: 'ของใช้ในบ้าน/ซูเปอร์' (ค่าซักผ้า)
- Purple (สีม่วง) -> Category: 'สาธารณูปโภค (น้ำ/ไฟ/เน็ต)' (ค่าห้อง)
- Light Green (สีเขียวอ่อน) -> Category: 'สาธารณูปโภค (น้ำ/ไฟ/เน็ต)' (จ่ายบิล)
` : ''}

${isPaotangAccount ? `
Special Rules for เป๋าตัง (Paotang / G-Wallet) slips:
1. Government Co-Pay / Subsidy: If the slip contains government co-pay / subsidy (e.g. คนละครึ่ง, เราชนะ, รัฐช่วยจ่าย, สิทธิประโยชน์):
   - The 'amount' MUST STRICTLY be ONLY the actual money paid by the user / deducted from G-Wallet (เช่น 'หักจาก G-Wallet', 'ผู้ซื้อจ่าย', 'ยอดเงินที่ชำระจริง').
   - DO NOT use the total price before discount or the government subsidy amount.
2. If the image is a QR Code generation screen for receiving money (e.g. THAI QR PAYMENT / PromptPay QR showing the user's name/account to receive funds):
   - Set "isReceiveQrOrRequest": true
   - Set "amount": 0
` : ''}

Special Transfer Rules:
- Transfers to Paotang / G-Wallet (ธ.กรุงไทย KTB 006, เลขบัญชี/Ref ลงท้าย 9289, หรือชื่อผู้รับ "KTB G-WALLET" / "G-Wallet"):
  This is a self-transfer between the user's accounts.
  - Set "suggestedCategory": "โอนระหว่างบัญชี"
  - Set "note": "โอนเข้าเป๋าตัง (G-Wallet)"

Extract the following information and output strictly in JSON format matching the schema below:

JSON Schema:
{
  "isReceiveQrOrRequest": boolean (true if this is a QR code generation / payment request screen like "THAI QR PAYMENT" / "สามารถสแกน QR เพื่อโอนเงินเข้าบัญชี" / promptpay QR for someone to scan, and NOT an executed transfer slip),
  "amount": number (e.g. 150.00),
  "date": "YYYY-MM-DD" (e.g. "2026-09-02"),
  "time": "HH:mm:ss" (e.g. "13:30:00"),
  "senderName": "Name of sender" or null,
  "receiverName": "Name of receiver / store / PromptPay" or null,
  "receiverAccount": "Account number or PromptPay number if visible" or null,
  "themeColor": "One of: ORANGE, RED, YELLOW, DARK_GREEN, PINK, PURPLE, LIGHT_GREEN, STANDARD",
  "pocketName": "Name of the cloud pocket if written on slip" or null,
  "suggestedCategory": "One of: อาหารและเครื่องดื่ม, ของใช้ในบ้าน/ซูเปอร์, การเดินทาง/ค่าน้ำมัน, ช้อปปิ้ง, สาธารณูปโภค (น้ำ/ไฟ/เน็ต), บันเทิง/สตรีมมิ่ง, สุขภาพ/ยา, โอนระหว่างบัญชี, อื่นๆ",
  "note": "Short description of transaction or receiver name"
}

Important Instructions:
1. Ensure amount is a pure number without commas or currency symbols.
2. If date is in Buddhist Era (e.g., 2567, 2568, 2569), convert to Gregorian calendar (e.g., 2024, 2025, 2026).
3. Identify BOTH Sender ('จาก' / 'โอนจาก') and Receiver ('ไปยัง' / 'โอนให้') accurately. If someone else transfers money to the user (e.g. วรโชติ), senderName must be that person's name.
4. If this image is a QR code generation / receive money screen (มีรูป QR Code ตรงกลางขนาดใหญ่, หัวข้อ "THAI QR PAYMENT", ข้อความ "สามารถสแกน QR เพื่อโอนเงินเข้าบัญชี", หรือหน้าจอสร้าง QR รับเงินที่ยังไม่ได้จ่ายเงินจริง):
   - Set "isReceiveQrOrRequest": true
   - Set "amount": 0
5. Return ONLY valid JSON, no markdown codeblocks, no explanations.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Image,
              mimeType,
            },
          },
        ],
      },
    ],
  });

  const rawText = response.text?.trim() || '{}';
  const cleanedJson = rawText.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleanedJson);
  } catch (err) {
    throw new Error(`Failed to parse AI response as JSON: ${rawText}`);
  }

  // Reject QR Code Generation / Receive screens
  if (parsed.isReceiveQrOrRequest) {
    return {
      amount: 0,
      date: parsed.date || new Date().toISOString().split('T')[0],
      time: parsed.time || '12:00:00',
      category: 'อื่นๆ',
      note: 'QR รับเงิน (ข้ามการบันทึก)',
      isSelfTransfer: false,
      type: 'EXPENSE',
    };
  }

  const sender = (parsed.senderName || '').toLowerCase();
  const receiver = (parsed.receiverName || '').toLowerCase();
  const note = (parsed.note || '').toLowerCase();
  const pocket = (parsed.pocketName || '').toLowerCase();

  const isUserSender = sender.includes('วรโชติ') || sender.includes('worachot');
  const isUserReceiver = receiver.includes('วรโชติ') || receiver.includes('worachot') || (note.includes('วรโชติ') && !note.includes('ร้าน'));

  const receiverAcc = (parsed.receiverAccount || '').toLowerCase();
  const isPaotangWalletTransfer =
    receiverAcc.includes('9289') ||
    receiver.includes('9289') ||
    note.includes('9289') ||
    receiver.includes('ktb g-wallet') ||
    receiver.includes('g-wallet') ||
    note.includes('ktb g-wallet') ||
    note.includes('โอนเข้าเป๋าตัง');

  // 1. Incoming Transfer: Someone else sends money to user -> INCOME
  const isIncomingTransfer = isUserReceiver && !isUserSender && sender.length > 0 && !isPaotangWalletTransfer;

  // 2. Self Transfer: User transfers money to himself or to own Paotang G-Wallet -> TRANSFER
  const isSelfTransfer = (isUserSender && isUserReceiver) || isPaotangWalletTransfer;

  // Resolve category by Color Theme for Make by KBank
  let category = parsed.suggestedCategory || 'อื่นๆ';
  const themeColor = (parsed.themeColor || '').toUpperCase();

  if (isMakeAccount) {
    if (themeColor === 'ORANGE') {
      category = 'อาหารและเครื่องดื่ม';
    } else if (themeColor === 'RED') {
      category = 'ช้อปปิ้ง';
    } else if (themeColor === 'YELLOW') {
      category = 'การเดินทาง/ค่าน้ำมัน';
    } else if (themeColor === 'DARK_GREEN') {
      category = 'การเดินทาง/ค่าน้ำมัน';
    } else if (themeColor === 'PINK') {
      category = 'ของใช้ในบ้าน/ซูเปอร์';
    } else if (themeColor === 'PURPLE') {
      category = 'สาธารณูปโภค (น้ำ/ไฟ/เน็ต)';
    } else if (themeColor === 'LIGHT_GREEN') {
      category = 'สาธารณูปโภค (น้ำ/ไฟ/เน็ต)';
    }
  }

  // Default: EXPENSE (เงินออกบัญชี)
  let transactionType: TransactionType = 'EXPENSE';

  if (isIncomingTransfer) {
    transactionType = 'INCOME';
    category = 'เงินเดือน/รายรับ';
  } else if (isSelfTransfer) {
    transactionType = 'TRANSFER';
    category = 'โอนระหว่างบัญชี';
  }

  return {
    amount: Number(parsed.amount) || 0,
    date: parsed.date || new Date().toISOString().split('T')[0],
    time: parsed.time || '12:00:00',
    senderName: parsed.senderName || undefined,
    receiverName: parsed.receiverName || undefined,
    receiverAccount: parsed.receiverAccount || undefined,
    category,
    note: parsed.note || (isIncomingTransfer ? `รับโอนจาก ${parsed.senderName}` : parsed.receiverName) || 'สลิปโอนเงิน',
    isSelfTransfer,
    type: transactionType,
  };
}

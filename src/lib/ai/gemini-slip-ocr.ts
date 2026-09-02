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

  const ownNamesConfig = process.env.OWN_ACCOUNT_NAMES || '';
  const ownNamesList = ownNamesConfig
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  const prompt = `
You are an expert Thai banking slip OCR assistant.
Analyze this Thai bank slip image (from bank: ${accountContext}).
Extract the following information and output strictly in JSON format matching the schema below.

JSON Schema:
{
  "amount": number (e.g. 150.00),
  "date": "YYYY-MM-DD" (e.g. "2026-09-02"),
  "time": "HH:mm:ss" (e.g. "13:30:00"),
  "senderName": "Name of sender" or null,
  "receiverName": "Name of receiver / store / PromptPay" or null,
  "receiverAccount": "Account number or PromptPay number if visible" or null,
  "suggestedCategory": "One of: อาหารและเครื่องดื่ม, ของใช้ในบ้าน/ซูเปอร์, การเดินทาง/ค่าน้ำมัน, ช้อปปิ้ง, สาธารณูปโภค (น้ำ/ไฟ/เน็ต), บันเทิง/สตรีมมิ่ง, สุขภาพ/ยา, โอนระหว่างบัญชี, อื่นๆ",
  "note": "Short description of transaction or receiver name"
}

Important Instructions:
1. Ensure amount is a pure number without commas or currency symbols.
2. If date is in Buddhist Era (e.g., 2567, 2568, 2569), convert to Gregorian calendar (e.g., 2024, 2025, 2026).
3. Return ONLY valid JSON, no markdown codeblocks, no explanations.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
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
  // Strip any markdown code fences if present
  const cleanedJson = rawText.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleanedJson);
  } catch (err) {
    throw new Error(`Failed to parse AI response as JSON: ${rawText}`);
  }

  // Check for self transfer
  const receiver = (parsed.receiverName || '').toLowerCase();
  const note = (parsed.note || '').toLowerCase();

  let isSelfTransfer = false;
  for (const name of ownNamesList) {
    if (name && (receiver.includes(name) || note.includes(name))) {
      isSelfTransfer = true;
      break;
    }
  }

  let transactionType: TransactionType = 'EXPENSE';
  let category = parsed.suggestedCategory || 'อื่นๆ';

  if (isSelfTransfer) {
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
    note: parsed.note || parsed.receiverName || 'สลิปโอนเงิน',
    isSelfTransfer,
    type: transactionType,
  };
}

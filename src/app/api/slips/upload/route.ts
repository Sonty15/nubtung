import { NextResponse } from 'next/server';
import { uploadSlipToDrive } from '@/lib/google/drive';
import { analyzeSlipImage } from '@/lib/ai/gemini-slip-ocr';
import { getBangkokDateString, getBangkokTimeString } from '@/lib/utils/date';
import { TransactionType } from '@/types';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'ไม่พบไฟล์รูปสลิปที่ต้องการอัปโหลด' }, { status: 400 });
    }

    const mimeType = file.type || 'image/jpeg';
    if (!mimeType.startsWith('image/')) {
      return NextResponse.json({ error: 'ไฟล์ที่อัปโหลดต้องเป็นไฟล์รูปภาพเท่านั้น' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Generate meaningful filename with Bangkok timestamp
    const dateStr = getBangkokDateString();
    const timeClean = getBangkokTimeString().replace(/:/g, '');
    const originalExt = file.name.split('.').pop() || 'jpg';
    const filename = `Upload_${dateStr}_${timeClean}_${Math.random().toString(36).substring(2, 6)}.${originalExt}`;

    // 1. Upload to Google Drive (Personal OAuth quota)
    const uploadedDrive = await uploadSlipToDrive({
      buffer,
      filename,
      mimeType,
    });

    // 2. Perform OCR analysis using Gemini
    let slipData = {
      amount: 0,
      date: dateStr,
      time: getBangkokTimeString(),
      type: 'EXPENSE' as TransactionType,
      category: 'อื่นๆ',
      note: file.name.replace(/\.[^/.]+$/, ''),
      isSelfTransfer: false,
      senderName: undefined as string | undefined,
      receiverName: undefined as string | undefined,
    };

    try {
      const ocrResult = await analyzeSlipImage(base64, mimeType, 'รับโอน/สลิปภายนอก');
      slipData = {
        amount: ocrResult.amount || 0,
        date: ocrResult.date || dateStr,
        time: ocrResult.time || getBangkokTimeString(),
        type: ocrResult.type || 'EXPENSE',
        category: ocrResult.category || 'อื่นๆ',
        note: ocrResult.note || '',
        isSelfTransfer: ocrResult.isSelfTransfer || false,
        senderName: ocrResult.senderName,
        receiverName: ocrResult.receiverName,
      };
    } catch (ocrErr: any) {
      console.warn('[Upload Slip] OCR parsing warning:', ocrErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'อัปโหลดและประมวลผลสลิปสำเร็จ',
      slip: {
        driveFileId: uploadedDrive.id,
        slipUrl: uploadedDrive.webViewLink,
        fileName: uploadedDrive.name,
        ...slipData,
      },
    });
  } catch (error: any) {
    console.error('[Upload Slip] Error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปสลิป' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { syncGhbInterestFromEmail } from '@/lib/ghb/sync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { success: false, error: 'ปีภาษีไม่ถูกต้อง (Invalid year)' },
        { status: 400 }
      );
    }

    const result = await syncGhbInterestFromEmail(year);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'ไม่สามารถดึงข้อมูลใบเสร็จจากอีเมลได้',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      year,
      totalInterest: result.totalInterest,
      receiptCount: result.receiptCount,
      receipts: result.receipts,
    });
  } catch (error: unknown) {
    console.error('[API /api/tax/ghb] Error syncing GHB receipts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

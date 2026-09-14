import { NextRequest, NextResponse } from 'next/server';
import { deleteMortgagePayment } from '@/lib/db/mortgage';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paymentId = parseInt(id, 10);

    if (isNaN(paymentId) || paymentId <= 0) {
      return NextResponse.json(
        { success: false, error: 'รหัสรายการชำระไม่ถูกต้อง (Invalid ID)' },
        { status: 400 }
      );
    }

    const deleted = await deleteMortgagePayment(paymentId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรายการชำระที่ต้องการลบ' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ลบรายการชำระสำเร็จ',
    });
  } catch (error: unknown) {
    console.error('[API /api/mortgage/payments/[id]] Error deleting payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

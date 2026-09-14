import { NextRequest, NextResponse } from 'next/server';
import {
  getMortgageAccounts,
  getMortgagePayments,
  saveMortgagePayment,
  calculateRemainingBalanceFromHistory,
} from '@/lib/db/mortgage';
import type { MortgagePayment } from '@/lib/mortgage/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const accountId = searchParams.get('accountId');
    const payments = await getMortgagePayments(accountId || undefined);

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error: unknown) {
    console.error('[API /api/mortgage/payments] Error fetching payments:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.accountId || typeof body.accountId !== 'string' || body.accountId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุเลขที่บัญชีสินเชื่อ (accountId)' },
        { status: 400 }
      );
    }

    if (
      !body.paymentDate ||
      typeof body.paymentDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.paymentDate.trim())
    ) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุวันที่ชำระในรูปแบบ YYYY-MM-DD (paymentDate)' },
        { status: 400 }
      );
    }

    const totalPaid = Number(body.totalPaid);
    if (isNaN(totalPaid) || totalPaid <= 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุยอดชำระที่ถูกต้องมากกว่า 0 (totalPaid)' },
        { status: 400 }
      );
    }

    const principal = Number(body.principal);
    if (isNaN(principal) || principal < 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุเงินต้นที่ถูกต้อง (principal)' },
        { status: 400 }
      );
    }

    const interest = Number(body.interest);
    if (isNaN(interest) || interest < 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุดอกเบี้ยที่ถูกต้อง (interest)' },
        { status: 400 }
      );
    }

    const fee = body.fee !== undefined ? Number(body.fee) : 0;
    if (isNaN(fee) || fee < 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุค่าธรรมเนียมที่ถูกต้อง (fee)' },
        { status: 400 }
      );
    }

    const accountId = body.accountId.trim();
    const accounts = await getMortgageAccounts();
    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      return NextResponse.json(
        { success: false, error: `ไม่พบบัญชีสินเชื่อรหัส ${accountId}` },
        { status: 404 }
      );
    }

    let remainingBalance: number;
    if (
      body.remainingBalance !== undefined &&
      body.remainingBalance !== null &&
      body.remainingBalance !== ''
    ) {
      remainingBalance = Number(body.remainingBalance);
      if (isNaN(remainingBalance) || remainingBalance < 0) {
        return NextResponse.json(
          { success: false, error: 'กรุณาระบุยอดหนี้คงเหลือที่ถูกต้อง (remainingBalance)' },
          { status: 400 }
        );
      }
    } else {
      // Calculate remaining balance from account loan history
      const existingPayments = await getMortgagePayments(accountId);
      remainingBalance = calculateRemainingBalanceFromHistory(account.loanAmount, [
        ...existingPayments,
        { principal },
      ]);
    }

    const installmentNo =
      body.installmentNo !== undefined &&
      body.installmentNo !== null &&
      body.installmentNo !== ''
        ? Number(body.installmentNo)
        : undefined;

    const receiptUid =
      body.receiptUid !== undefined &&
      body.receiptUid !== null &&
      String(body.receiptUid).trim() !== ''
        ? String(body.receiptUid).trim()
        : undefined;

    const source = body.source === 'EMAIL_SYNC' ? 'EMAIL_SYNC' : 'MANUAL';

    const payment: MortgagePayment = {
      accountId,
      paymentDate: body.paymentDate.trim(),
      installmentNo: installmentNo !== undefined && !isNaN(installmentNo) ? installmentNo : undefined,
      totalPaid: Math.round(totalPaid * 100) / 100,
      principal: Math.round(principal * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      fee: Math.round(fee * 100) / 100,
      remainingBalance: Math.round(remainingBalance * 100) / 100,
      receiptUid,
      source,
    };

    await saveMortgagePayment(payment);

    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error: unknown) {
    console.error('[API /api/mortgage/payments] Error saving payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

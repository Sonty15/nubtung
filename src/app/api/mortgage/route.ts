import { NextRequest, NextResponse } from 'next/server';
import {
  getMortgageAccounts,
  getMortgagePayments,
  calculateRemainingBalanceFromHistory,
} from '@/lib/db/mortgage';
import type { MortgageAccount, MortgagePayment, MortgageSummary } from '@/lib/mortgage/types';

export const dynamic = 'force-dynamic';

export function calculateMortgageSummary(
  accounts: MortgageAccount[],
  payments: MortgagePayment[]
): MortgageSummary {
  const accountSummaries = accounts.map((acc) => {
    const paymentsForAcc = payments.filter((p) => p.accountId === acc.id);
    const sortedPayments = [...paymentsForAcc].sort((a, b) => {
      const dateDiff = a.paymentDate.localeCompare(b.paymentDate);
      if (dateDiff !== 0) return dateDiff;
      return (a.id || 0) - (b.id || 0);
    });

    const principalPaid = Math.round(
      sortedPayments.reduce((sum, p) => sum + (Number(p.principal) || 0), 0) * 100
    ) / 100;

    const interestPaid = Math.round(
      sortedPayments.reduce((sum, p) => sum + (Number(p.interest) || 0), 0) * 100
    ) / 100;

    const feePaid = Math.round(
      sortedPayments.reduce((sum, p) => sum + (Number(p.fee) || 0), 0) * 100
    ) / 100;

    const lastPayment = sortedPayments[sortedPayments.length - 1];
    const remainingBalance =
      lastPayment && typeof lastPayment.remainingBalance === 'number' && lastPayment.remainingBalance > 0
        ? Math.round(lastPayment.remainingBalance * 100) / 100
        : calculateRemainingBalanceFromHistory(acc.loanAmount, sortedPayments);

    const progressPercent =
      acc.loanAmount > 0
        ? Math.min(100, Math.round((principalPaid / acc.loanAmount) * 10000) / 100)
        : 0;

    return {
      ...acc,
      remainingBalance,
      principalPaid,
      interestPaid,
      feePaid,
      progressPercent,
      paymentCount: sortedPayments.length,
    };
  });

  const totalLoanAmount = Math.round(
    accountSummaries.reduce((sum, a) => sum + a.loanAmount, 0) * 100
  ) / 100;

  const totalRemainingBalance = Math.round(
    accountSummaries.reduce((sum, a) => sum + a.remainingBalance, 0) * 100
  ) / 100;

  const totalPrincipalPaid = Math.round(
    accountSummaries.reduce((sum, a) => sum + a.principalPaid, 0) * 100
  ) / 100;

  const totalInterestPaid = Math.round(
    accountSummaries.reduce((sum, a) => sum + a.interestPaid, 0) * 100
  ) / 100;

  const totalFeePaid = Math.round(
    accountSummaries.reduce((sum, a) => sum + a.feePaid, 0) * 100
  ) / 100;

  const progressPercent =
    totalLoanAmount > 0
      ? Math.min(100, Math.round((totalPrincipalPaid / totalLoanAmount) * 10000) / 100)
      : 0;

  return {
    totalLoanAmount,
    totalRemainingBalance,
    totalPrincipalPaid,
    totalInterestPaid,
    totalFeePaid,
    progressPercent,
    accounts: accountSummaries,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const accountId = searchParams.get('accountId');

    const accounts = await getMortgageAccounts();
    const allPayments = await getMortgagePayments();

    const summary = calculateMortgageSummary(accounts, allPayments);

    const payments = accountId
      ? allPayments.filter((p) => p.accountId === accountId)
      : allPayments;

    return NextResponse.json({
      success: true,
      summary,
      payments,
    });
  } catch (error: unknown) {
    console.error('[API /api/mortgage] Error fetching mortgage summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

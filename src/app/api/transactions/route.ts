import { NextResponse } from 'next/server';
import { getAllTransactions, appendTransactionRow, ensureSheetStructure } from '@/lib/google/sheets';
import { Transaction, DashboardSummary } from '@/types';

export async function GET() {
  try {
    await ensureSheetStructure();
    const transactions = await getAllTransactions();

    let totalIncome = 0;
    let totalExpense = 0;
    let transferTotal = 0;
    const accountBreakdown: Record<string, number> = {};
    const categoryBreakdown: Record<string, number> = {};

    for (const tx of transactions) {
      if (tx.type === 'INCOME') {
        totalIncome += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        totalExpense += tx.amount;
        // Group expenses by category
        categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + tx.amount;
        // Group expenses by account
        accountBreakdown[tx.account] = (accountBreakdown[tx.account] || 0) + tx.amount;
      } else if (tx.type === 'TRANSFER') {
        transferTotal += tx.amount;
      }
    }

    // Baseline balances as of latest reconciled statement (2026-09-02)
    const dynamicAccountBalances: Record<string, number> = {
      'K PLUS': 43253.07,
      'Make by KBank': 903.29,
      'เป๋าตัง': 0.00,
      'เงินสด': 0.00,
    };

    // Calculate real-time dynamic balance updates from transactions dated >= 2026-09-03
    for (const tx of transactions) {
      if (tx.date >= '2026-09-03') {
        const acc = tx.account || 'เงินสด';
        if (dynamicAccountBalances[acc] === undefined) {
          dynamicAccountBalances[acc] = 0;
        }

        if (tx.type === 'INCOME') {
          dynamicAccountBalances[acc] += tx.amount;
        } else if (tx.type === 'EXPENSE') {
          dynamicAccountBalances[acc] -= tx.amount;
        } else if (tx.type === 'TRANSFER') {
          dynamicAccountBalances[acc] -= tx.amount;
        }
      }
    }

    const totalCashInAccounts = Object.values(dynamicAccountBalances).reduce((sum, b) => sum + b, 0);

    const summary: DashboardSummary = {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      transferTotal,
      accountBreakdown,
      categoryBreakdown,
      recentTransactions: transactions.slice(0, 10),
      accountBalances: dynamicAccountBalances,
      totalCashInAccounts,
    };

    return NextResponse.json({
      transactions,
      summary,
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions from Google Sheets' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.amount || !body.type || !body.category) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน (จำนวนเงิน, ประเภท, หมวดหมู่)' },
        { status: 400 }
      );
    }

    const now = new Date();
    const dateStr = body.date || now.toISOString().split('T')[0];
    const timeStr = body.time || now.toTimeString().split(' ')[0];

    const tx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: dateStr,
      time: timeStr,
      type: body.type,
      amount: parseFloat(body.amount),
      category: body.category,
      account: body.account || 'เงินสด',
      note: body.note || '',
      slipUrl: body.slipUrl || undefined,
      source: 'MANUAL',
      createdAt: now.toISOString(),
    };

    await appendTransactionRow(tx);

    return NextResponse.json({ success: true, transaction: tx });
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record transaction' },
      { status: 500 }
    );
  }
}

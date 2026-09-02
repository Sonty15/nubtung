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

    const summary: DashboardSummary = {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      transferTotal,
      accountBreakdown,
      categoryBreakdown,
      recentTransactions: transactions.slice(0, 10),
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

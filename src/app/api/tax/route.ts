import { NextRequest, NextResponse } from 'next/server';
import { getTransactions, getTaxProfile, saveTaxProfile } from '@/lib/google/sheets';
import { calculateTax, defaultDeductions, defaultIncome } from '@/lib/tax/tax-engine';
import { aggregateTransactionsToIncome } from '@/lib/tax/category-mapping';
import { TaxDeductions, IncomeBySection } from '@/lib/tax/tax-types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const parsedYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    const year = isNaN(parsedYear) ? new Date().getFullYear() : parsedYear;

    // 1. Fetch transactions for the year from Google Sheets
    const transactions = await getTransactions();
    const yearTransactions = transactions.filter((tx) => {
      if (!tx.date) return false;
      return tx.date.startsWith(String(year));
    });

    const syncedIncome = aggregateTransactionsToIncome(yearTransactions);

    // 2. Fetch saved profile from Sheet if available
    let savedProfile = null;
    try {
      savedProfile = await getTaxProfile(year);
    } catch (sheetErr) {
      console.warn('Could not fetch saved tax profile:', sheetErr);
    }

    const initialIncome: IncomeBySection = savedProfile?.income || syncedIncome || defaultIncome;
    const initialDeductions: TaxDeductions = savedProfile?.deductions || defaultDeductions;
    const initialWithholding = savedProfile?.withholdingTax || 0;

    const calculated = calculateTax(initialIncome, initialDeductions, initialWithholding);

    return NextResponse.json({
      success: true,
      year,
      syncedIncome,
      savedProfile,
      calculated,
    });
  } catch (error: any) {
    console.error('Error fetching tax data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch tax data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, income, deductions, withholdingTax } = body;

    if (!year || !income || !deductions) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: year, income, deductions' },
        { status: 400 }
      );
    }

    const calculated = calculateTax(income, deductions, Number(withholdingTax) || 0);

    // Save to Google Sheets
    await saveTaxProfile(calculated, deductions, Number(year));

    return NextResponse.json({
      success: true,
      message: 'บันทึกข้อมูลภาษีลง Google Sheets เรียบร้อยแล้ว',
      calculated,
    });
  } catch (error: any) {
    console.error('Error saving tax profile:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save tax profile' },
      { status: 500 }
    );
  }
}

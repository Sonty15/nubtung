import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error - node test runner requires .ts extension for ESM strip-types
import { calculateTax, defaultDeductions, defaultIncome, TAX_BRACKETS } from './tax-engine.ts';

describe('Tax Engine - Thai Personal Income Tax Calculation', () => {
  it('has 8 tax brackets defined', () => {
    assert.strictEqual(TAX_BRACKETS.length, 8);
  });
  it('calculates zero tax for income within exempt bracket (<= 150,000 net)', () => {
    const income = { ...defaultIncome, section40_1: 300000 }; // 300k salary
    // expense: 50% max 100k = 100k -> remaining 200k
    // personal deduction: 60k -> net income 140k (<= 150k exempt)
    const result = calculateTax(income, defaultDeductions, 0);
    assert.strictEqual(result.totalIncome, 300000);
    assert.strictEqual(result.totalDeductibleExpenses, 100000);
    assert.strictEqual(result.totalDeductions, 60000);
    assert.strictEqual(result.netTaxableIncome, 140000);
    assert.strictEqual(result.progressiveTax, 0);
    assert.strictEqual(result.finalTax, 0);
    assert.strictEqual(result.netTaxPayable, 0);
  });

  it('caps combined 40(1) and 40(2) expense deduction at 100,000', () => {
    const income = { ...defaultIncome, section40_1: 400000, section40_2: 300000 };
    // total 700k -> 50% is 350k, but capped at 100k
    const result = calculateTax(income, defaultDeductions, 0);
    assert.strictEqual(result.totalDeductibleExpenses, 100000);
  });

  it('computes progressive tax tiers correctly for higher incomes', () => {
    // Net taxable income 600,000:
    // 0 - 150k: 0
    // 150k - 300k (150k @ 5%): 7,500
    // 300k - 500k (200k @ 10%): 20,000
    // 500k - 600k (100k @ 15%): 15,000
    // Total progressive tax = 42,500
    const income = { ...defaultIncome, section40_1: 760000 };
    // 760k - 100k expense - 60k personal = 600k net
    const result = calculateTax(income, defaultDeductions, 10000);
    assert.strictEqual(result.netTaxableIncome, 600000);
    assert.strictEqual(result.progressiveTax, 42500);
    assert.strictEqual(result.finalTax, 42500);
    assert.strictEqual(result.withholdingTax, 10000);
    assert.strictEqual(result.netTaxPayable, 32500); // 42500 - 10000
  });

  it('enforces retirement funds cap of 500,000 and ThaiESG cap of 300,000', () => {
    const income = { ...defaultIncome, section40_1: 3000000 }; // 3M
    const deductions = {
      ...defaultDeductions,
      rmf: 300000,
      ssf: 200000,
      pvd: 200000, // Total retirement input = 700,000 -> must cap at 500,000
      thaiEsg: 400000, // ThaiESG input = 400,000 -> must cap at 300,000
    };
    const result = calculateTax(income, deductions, 0);
    // Personal (60k) + Retirement capped (500k) + ThaiESG capped (300k) = 860k
    assert.strictEqual(result.totalDeductions, 860000);
  });

  it('calculates 0.5% flat tax on non-40(1) income when applicable', () => {
    // 40(8) income: 2,000,000. Expense 60% = 1,200,000 -> 800k.
    // Deductions: 60k personal + 740k others to make net taxable = 0
    // Flat tax 0.5% on 2,000,000 = 10,000 (> 5,000 threshold)
    const income = { ...defaultIncome, section40_8: 2000000 };
    const deductions = {
      ...defaultDeductions,
      personal: 60000,
      rmf: 500000,
      thaiEsg: 240000,
      generalDonation: 50000,
    };
    const result = calculateTax(income, deductions, 0);
    assert.strictEqual(result.flatTax05, 10000);
    assert.strictEqual(result.taxMethodUsed, 'flat05');
  });

  it('reports refund when withholding tax exceeds final tax', () => {
    const income = { ...defaultIncome, section40_1: 500000 };
    // 500k - 100k - 60k = 340k net
    // Tax: 150k @ 0% + 150k @ 5% (7500) + 40k @ 10% (4000) = 11,500
    // Withholding tax = 20,000 -> Refund 8,500 (netTaxPayable = -8500)
    const result = calculateTax(income, defaultDeductions, 20000);
    assert.strictEqual(result.finalTax, 11500);
    assert.strictEqual(result.netTaxPayable, -8500);
    assert.strictEqual(result.isRefund, true);
  });

  it('correctly calculates progressive tax across all tiers up to > 5,000,000', () => {
    // Net taxable income: 6,000,000
    // 0 - 150k @ 0% = 0
    // 150k - 300k (150k @ 5%) = 7,500
    // 300k - 500k (200k @ 10%) = 20,000
    // 500k - 750k (250k @ 15%) = 37,500
    // 750k - 1,000,000 (250k @ 20%) = 50,000
    // 1,000,000 - 2,000,000 (1,000,000 @ 25%) = 250,000
    // 2,000,000 - 5,000,000 (3,000,000 @ 30%) = 900,000
    // 5,000,000 - 6,000,000 (1,000,000 @ 35%) = 350,000
    // Total progressive tax = 7,500 + 20,000 + 37,500 + 50,000 + 250,000 + 900,000 + 350,000 = 1,615,000
    const income = { ...defaultIncome, section40_1: 6160000 };
    // 6,160,000 - 100k expense - 60k personal = 6,000,000 net
    const result = calculateTax(income, defaultDeductions, 0);
    assert.strictEqual(result.netTaxableIncome, 6000000);
    assert.strictEqual(result.progressiveTax, 1615000);
    assert.strictEqual(result.finalTax, 1615000);
    assert.strictEqual(result.taxBrackets[4].minIncome, 750000);
    assert.strictEqual(result.taxBrackets[4].maxIncome, 1000000);
    assert.strictEqual(result.taxBrackets[4].taxInTier, 50000);
    assert.strictEqual(result.taxBrackets[7].isCurrentTier, true);
  });

  it('tests sequential donation cap (double donation first up to 10%, then general donation up to 10% of remainder)', () => {
    // Income: 960,000 (40_1) -> Expense 100,000 -> After expense 860,000
    // Deductions before donation: 60,000 (personal)
    // Remaining before donation = 860,000 - 60,000 = 800,000
    // 1. Double donation: input 50,000 x 2 = 100,000 claimed.
    //    Cap = 10% of 800,000 = 80,000. Deducted = 80,000.
    // 2. Remaining for general donation = 800,000 - 80,000 = 720,000.
    //    General donation cap = 10% of 720,000 = 72,000.
    //    General donation input: 80,000 claimed -> Capped at 72,000.
    // Total donations deducted = 80,000 + 72,000 = 152,000.
    const income = { ...defaultIncome, section40_1: 960000 };
    const deductions = {
      ...defaultDeductions,
      doubleDonation: 50000,
      generalDonation: 80000,
    };
    const result = calculateTax(income, deductions, 0);
    assert.strictEqual(result.deductionsBreakdown.donations, 152000);
    assert.strictEqual(result.totalDeductions, 212000); // 60k personal + 152k donations
    assert.strictEqual(result.netTaxableIncome, 648000); // 860k - 212k
  });

  it('clamps negative inputs and counts to non-negative values', () => {
    const income = { ...defaultIncome, section40_1: 500000 };
    const deductions = {
      ...defaultDeductions,
      childCount: -2,
      parentCount: -1,
      socialSecurity: -5000,
      lifeInsurance: -10000,
      doubleDonation: -2000,
    };
    const result = calculateTax(income, deductions, -1000);
    assert.strictEqual(result.deductionsBreakdown.personalFamily, 60000); // Only personal 60k
    assert.strictEqual(result.deductionsBreakdown.insuranceSavings, 0);
    assert.strictEqual(result.deductionsBreakdown.donations, 0);
    assert.strictEqual(result.withholdingTax, 0);
  });

  it('tests health insurance and life insurance combined cap at 100,000', () => {
    const income = { ...defaultIncome, section40_1: 500000 };
    const deductions = {
      ...defaultDeductions,
      lifeInsurance: 90000,
      healthInsurance: 25000, // combined = 115k -> capped at 100k
    };
    const result = calculateTax(income, deductions, 0);
    assert.strictEqual(result.deductionsBreakdown.insuranceSavings, 100000);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error - node test runner import
import { getInterestRateForMonth, simulateMortgageSchedule, compareExtraPayment } from './simulator.ts';
// @ts-expect-error - node test runner import
import { DEFAULT_INTEREST_CONFIG } from '../db/mortgage.ts';

describe('Mortgage Simulator Engine', () => {
  it('returns correct interest rate for contract year tiers', () => {
    // Month 1-12: 2.20%
    assert.strictEqual(getInterestRateForMonth(1, DEFAULT_INTEREST_CONFIG), 2.20);
    assert.strictEqual(getInterestRateForMonth(12, DEFAULT_INTEREST_CONFIG), 2.20);
    // Month 13-24: 3.25%
    assert.strictEqual(getInterestRateForMonth(13, DEFAULT_INTEREST_CONFIG), 3.25);
    // Month 25-36: MRR - 2.895 = 6.145 - 2.895 = 3.25%
    assert.strictEqual(getInterestRateForMonth(25, DEFAULT_INTEREST_CONFIG), 3.25);
    // Month 37+: MRR - 0.50 = 6.145 - 0.50 = 5.645%
    assert.strictEqual(getInterestRateForMonth(37, DEFAULT_INTEREST_CONFIG), 5.645);
  });

  it('falls back to the last tier if month exceeds configured tiers', () => {
    // Month 500 is past endMonth 480: should use last tier (MRR - 0.50)
    assert.strictEqual(getInterestRateForMonth(500, DEFAULT_INTEREST_CONFIG), 5.645);
  });

  it('calculates extra payment savings accurately', () => {
    const comparison = compareExtraPayment({
      principal: 2100000,
      startMonthIndex: 1,
      baseMonthlyPayment: 8500,
      extraMonthlyPayment: 3000,
      interestConfig: DEFAULT_INTEREST_CONFIG,
    });

    assert.ok(comparison.monthsSaved > 0, 'Should reduce payment months');
    assert.ok(comparison.interestSaved > 100000, 'Should save substantial interest');
    assert.strictEqual(comparison.withExtra.totalMonths < comparison.standard.totalMonths, true);
    assert.strictEqual(comparison.yearsSaved, Math.round((comparison.monthsSaved / 12) * 10) / 10);
    assert.strictEqual(comparison.withExtra.totalPrincipal, 2100000);
  });

  it('simulates mortgage schedule with correct balance amortization and schedule points', () => {
    const result = simulateMortgageSchedule({
      principal: 100000,
      monthlyPayment: 10000,
      interestConfig: DEFAULT_INTEREST_CONFIG,
      startMonthIndex: 1,
    });

    assert.ok(result.totalMonths > 0);
    assert.strictEqual(result.totalPrincipal, 100000);
    assert.ok(result.totalInterest > 0);
    assert.strictEqual(result.totalPaid, Math.round((result.totalPrincipal + result.totalInterest) * 100) / 100);

    // Verify schedule point consistency
    const firstPoint = result.schedule[0];
    assert.strictEqual(firstPoint.month, 1);
    assert.strictEqual(firstPoint.interestRate, 2.20);
    assert.strictEqual(firstPoint.payment, firstPoint.principalPaid + firstPoint.interestPaid);

    const lastPoint = result.schedule[result.schedule.length - 1];
    assert.strictEqual(lastPoint.remainingBalance, 0);
  });

  it('handles zero extra payment by returning zero savings', () => {
    const comparison = compareExtraPayment({
      principal: 500000,
      startMonthIndex: 1,
      baseMonthlyPayment: 10000,
      extraMonthlyPayment: 0,
      interestConfig: DEFAULT_INTEREST_CONFIG,
    });

    assert.strictEqual(comparison.monthsSaved, 0);
    assert.strictEqual(comparison.yearsSaved, 0);
    assert.strictEqual(comparison.interestSaved, 0);
    assert.strictEqual(comparison.standard.totalMonths, comparison.withExtra.totalMonths);
  });

  it('respects maxMonths safeguard against underpayment infinite loop', () => {
    // A payment too low to pay interest (e.g. 50 baht/month on 10,000,000)
    const result = simulateMortgageSchedule({
      principal: 10000000,
      monthlyPayment: 50,
      interestConfig: DEFAULT_INTEREST_CONFIG,
      maxMonths: 24,
    });

    assert.strictEqual(result.totalMonths, 24);
    assert.ok(result.schedule[result.schedule.length - 1].remainingBalance > 0);
  });
});

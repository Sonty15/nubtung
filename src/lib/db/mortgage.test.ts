import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error - node test runner requires .ts extension for ESM strip-types
import { calculateRemainingBalanceFromHistory } from './mortgage.ts';

describe('Mortgage DB Balance Calculation Helper', () => {
  it('computes remaining balance sequentially starting from loan amount', () => {
    const loanAmount = 2100000;
    const payments = [
      { principal: 5000, fee: 0, interest: 3850 },
      { principal: 5200, fee: 0, interest: 3800 },
    ];
    const b1 = calculateRemainingBalanceFromHistory(loanAmount, payments.slice(0, 1));
    assert.strictEqual(b1, 2095000);
    const b2 = calculateRemainingBalanceFromHistory(loanAmount, payments);
    assert.strictEqual(b2, 2089800);
  });

  it('handles empty payments list by returning full loan amount', () => {
    const loanAmount = 2100000;
    const balance = calculateRemainingBalanceFromHistory(loanAmount, []);
    assert.strictEqual(balance, 2100000);
  });

  it('clamps to zero when principal paid exceeds loan amount', () => {
    const loanAmount = 100000;
    const payments = [{ principal: 150000 }];
    const balance = calculateRemainingBalanceFromHistory(loanAmount, payments);
    assert.strictEqual(balance, 0);
  });

  it('handles float precision properly', () => {
    const loanAmount = 100023.00;
    const payments = [
      { principal: 1234.56 },
      { principal: 567.89 },
    ];
    // 100023.00 - 1234.56 - 567.89 = 98220.55
    const balance = calculateRemainingBalanceFromHistory(loanAmount, payments);
    assert.strictEqual(balance, 98220.55);
  });
});

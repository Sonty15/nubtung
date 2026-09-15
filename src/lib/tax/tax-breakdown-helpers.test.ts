import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error - node test runner requires .ts extension for ESM strip-types
import { formatThaiDate, isTransactionExcluded, getTransactionStatusInfo } from './tax-breakdown-helpers.ts';
import type { TaxBreakdownTransaction } from './tax-types.ts';

describe('tax-breakdown-helpers', () => {
  describe('formatThaiDate', () => {
    it('formats YYYY-MM-DD correctly in Thai Buddhist Era', () => {
      const formatted = formatThaiDate('2026-09-15');
      assert.strictEqual(formatted, '15 ก.ย. 2569');
    });

    it('handles empty or undefined strings gracefully', () => {
      assert.strictEqual(formatThaiDate(''), '-');
      assert.strictEqual(formatThaiDate(undefined), '-');
    });

    it('returns raw string if parsing fails', () => {
      assert.strictEqual(formatThaiDate('not-a-date'), 'not-a-date');
    });
  });

  describe('isTransactionExcluded', () => {
    it('returns false for standard taxable transaction when not in excludedIds', () => {
      const tx: TaxBreakdownTransaction = {
        id: 'tx-1',
        date: '2026-01-25',
        type: 'INCOME',
        amount: 50000,
        category: 'เงินเดือน',
        section: 'section40_1',
        isExempt: false,
      };

      const excludedIds = new Set<string>();
      assert.strictEqual(isTransactionExcluded(tx, excludedIds), false);
    });

    it('returns true for standard transaction when ID is present in excludedIds', () => {
      const tx: TaxBreakdownTransaction = {
        id: 'tx-1',
        date: '2026-01-25',
        type: 'INCOME',
        amount: 50000,
        category: 'เงินเดือน',
        section: 'section40_1',
        isExempt: false,
      };

      const excludedIds = new Set(['tx-1']);
      assert.strictEqual(isTransactionExcluded(tx, excludedIds), true);
    });

    it('returns true for auto-exempt transaction regardless of excludedIds', () => {
      const tx: TaxBreakdownTransaction = {
        id: 'tx-loan',
        date: '2026-02-10',
        type: 'INCOME',
        amount: 140000,
        category: 'รายรับอื่นๆ',
        section: 'section40_8',
        isExempt: true,
        exemptionReason: 'LOAN_CASHBACK',
      };

      assert.strictEqual(isTransactionExcluded(tx, new Set<string>()), true);
      assert.strictEqual(isTransactionExcluded(tx, new Set(['tx-loan'])), true);
    });
  });

  describe('getTransactionStatusInfo', () => {
    it('returns taxable badge when transaction is not excluded', () => {
      const tx: TaxBreakdownTransaction = {
        id: 'tx-1',
        date: '2026-01-25',
        type: 'INCOME',
        amount: 50000,
        category: 'เงินเดือน',
        section: 'section40_1',
        isExempt: false,
      };

      const info = getTransactionStatusInfo(tx, false);
      assert.strictEqual(info.statusType, 'taxable');
      assert.strictEqual(info.statusBadgeText, '🟢 รวมในภาษี');
    });

    it('returns user-excluded badge for standard transaction when excluded', () => {
      const tx: TaxBreakdownTransaction = {
        id: 'tx-1',
        date: '2026-01-25',
        type: 'INCOME',
        amount: 50000,
        category: 'เงินเดือน',
        section: 'section40_1',
        isExempt: false,
      };

      const info = getTransactionStatusInfo(tx, true);
      assert.strictEqual(info.statusType, 'user-excluded');
      assert.strictEqual(info.statusBadgeText, '⚪ ยกเว้นโดยผู้ใช้');
    });

    it('returns auto-exempt badge with reason label for auto-exempt transaction', () => {
      const tx: TaxBreakdownTransaction = {
        id: 'tx-loan',
        date: '2026-02-10',
        type: 'INCOME',
        amount: 140000,
        category: 'รายรับอื่นๆ',
        section: 'section40_8',
        isExempt: true,
        exemptionReason: 'LOAN_CASHBACK',
      };

      const info = getTransactionStatusInfo(tx, true);
      assert.strictEqual(info.statusType, 'auto-exempt');
      assert.strictEqual(info.statusBadgeText, '🚫 ยกเว้นอัตโนมัติ');
      assert.strictEqual(info.reasonLabel, 'เงินกู้/ส่วนต่าง');
    });

    it('maps all exemption reasons correctly', () => {
      const reasons: Array<{ reason: 'LOAN_CASHBACK' | 'FAMILY_SUPPORT' | 'COST_SHARING' | 'REFUND_TRANSFER'; expected: string }> = [
        { reason: 'LOAN_CASHBACK', expected: 'เงินกู้/ส่วนต่าง' },
        { reason: 'FAMILY_SUPPORT', expected: 'อุปการะครอบครัว (ม.42(26))' },
        { reason: 'COST_SHARING', expected: 'แชร์ค่าใช้จ่าย' },
        { reason: 'REFUND_TRANSFER', expected: 'โอนย้าย/เงินคืน' },
      ];

      for (const { reason, expected } of reasons) {
        const tx: TaxBreakdownTransaction = {
          id: `tx-${reason}`,
          date: '2026-01-01',
          type: 'INCOME',
          amount: 1000,
          category: 'อื่นๆ',
          section: 'section40_8',
          isExempt: true,
          exemptionReason: reason,
        };
        const info = getTransactionStatusInfo(tx, true);
        assert.strictEqual(info.reasonLabel, expected);
      }
    });
  });
});

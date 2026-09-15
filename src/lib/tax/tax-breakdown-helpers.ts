import type {
  IncomeBySection,
  TaxBreakdownTransaction,
  ExemptionReason,
} from './tax-types.ts';

export const REASON_LABELS: Record<ExemptionReason, string> = {
  LOAN_CASHBACK: 'เงินกู้/ส่วนต่าง',
  FAMILY_SUPPORT: 'อุปการะครอบครัว (ม.42(26))',
  COST_SHARING: 'แชร์ค่าใช้จ่าย',
  REFUND_TRANSFER: 'โอนย้าย/เงินคืน',
};

export const SECTION_CODE_MAP: Record<keyof IncomeBySection, string> = {
  section40_1: '40(1)',
  section40_2: '40(2)',
  section40_3: '40(3)',
  section40_4: '40(4)',
  section40_5: '40(5)',
  section40_6: '40(6)',
  section40_7: '40(7)',
  section40_8: '40(8)',
};

/**
 * Formats a date string into Thai Buddhist Era format (e.g. 15 ก.ย. 2569).
 */
export function formatThaiDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Determines whether a transaction is currently excluded from taxable income.
 * - Standard income transaction: excluded if in excludedIds or isUserExcluded.
 * - Auto-exempt transaction: excluded by default, but user can force-include (by toggling into excludedIds).
 */
export function isTransactionExcluded(
  tx: TaxBreakdownTransaction,
  excludedIds: Set<string>
): boolean {
  const isMarked = tx.id ? excludedIds.has(tx.id) : false;
  if (tx.isExempt) {
    // If user toggled an auto-exempt transaction, it is force-included (so not excluded).
    return !isMarked;
  }
  return isMarked || Boolean(tx.isUserExcluded);
}

/**
 * Returns badge text, type, and exemption reason label for a transaction.
 */
export function getTransactionStatusInfo(
  tx: TaxBreakdownTransaction,
  isExcluded: boolean
): {
  statusType: 'taxable' | 'auto-exempt' | 'user-excluded';
  statusBadgeText: string;
  reasonLabel?: string;
} {
  if (!isExcluded) {
    return {
      statusType: 'taxable',
      statusBadgeText: '🟢 รวมในภาษี',
    };
  }

  if (tx.isExempt) {
    const reasonText = tx.exemptionReason
      ? REASON_LABELS[tx.exemptionReason] || 'รายการยกเว้นตามกฎหมาย'
      : 'รายการยกเว้นตามกฎหมาย';
    return {
      statusType: 'auto-exempt',
      statusBadgeText: '🚫 ยกเว้นอัตโนมัติ',
      reasonLabel: reasonText,
    };
  }

  return {
    statusType: 'user-excluded',
    statusBadgeText: '⚪ ยกเว้นโดยผู้ใช้',
  };
}

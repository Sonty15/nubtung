import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error - node test runner requires .ts extension for ESM strip-types
import { mapCategoryToSection, aggregateTransactionsToIncome, checkTaxExemption, categorizeTransactionsForTax, serializeExcludedTransactionIds, deserializeExcludedTransactionIds } from './category-mapping.ts';

describe('Category to Tax Mapping', () => {
  it('maps salary keywords to section 40(1)', () => {
    assert.strictEqual(mapCategoryToSection('เงินเดือน'), 'section40_1');
    assert.strictEqual(mapCategoryToSection('โบนัส'), 'section40_1');
    assert.strictEqual(mapCategoryToSection('Salary'), 'section40_1');
    assert.strictEqual(mapCategoryToSection('bonus'), 'section40_1');
    assert.strictEqual(mapCategoryToSection('เบี้ยเลี้ยง'), 'section40_1');
  });

  it('maps freelance and commission keywords to section 40(2)', () => {
    assert.strictEqual(mapCategoryToSection('ฟรีแลนซ์'), 'section40_2');
    assert.strictEqual(mapCategoryToSection('รับจ้าง'), 'section40_2');
    assert.strictEqual(mapCategoryToSection('ค่านายหน้า'), 'section40_2');
    assert.strictEqual(mapCategoryToSection('freelance'), 'section40_2');
    assert.strictEqual(mapCategoryToSection('คอมมิชชั่น'), 'section40_2');
    assert.strictEqual(mapCategoryToSection('จ้างทำของ'), 'section40_2');
  });

  it('maps copyright and royalty keywords to section 40(3)', () => {
    assert.strictEqual(mapCategoryToSection('ลิขสิทธิ์'), 'section40_3');
    assert.strictEqual(mapCategoryToSection('Royalty'), 'section40_3');
    assert.strictEqual(mapCategoryToSection('สิทธิบัตร'), 'section40_3');
  });

  it('maps dividend, interest and crypto keywords to section 40(4)', () => {
    assert.strictEqual(mapCategoryToSection('ดอกเบี้ย'), 'section40_4');
    assert.strictEqual(mapCategoryToSection('เงินปันผล'), 'section40_4');
    assert.strictEqual(mapCategoryToSection('Dividend'), 'section40_4');
    assert.strictEqual(mapCategoryToSection('interest'), 'section40_4');
    assert.strictEqual(mapCategoryToSection('คริปโต'), 'section40_4');
    assert.strictEqual(mapCategoryToSection('Crypto'), 'section40_4');
  });

  it('maps rental keywords to section 40(5)', () => {
    assert.strictEqual(mapCategoryToSection('ค่าเช่า'), 'section40_5');
    assert.strictEqual(mapCategoryToSection('Rent'), 'section40_5');
    assert.strictEqual(mapCategoryToSection('House Rent'), 'section40_5');
    assert.strictEqual(mapCategoryToSection('เช่าบ้าน'), 'section40_5');
  });

  it('does not map words containing rent as substring like parent to section 40(5)', () => {
    assert.strictEqual(mapCategoryToSection('parent'), 'section40_8');
    assert.strictEqual(mapCategoryToSection('parent support'), 'section40_8');
  });

  it('maps liberal profession keywords to section 40(6)', () => {
    assert.strictEqual(mapCategoryToSection('วิชาชีพอิสระ'), 'section40_6');
    assert.strictEqual(mapCategoryToSection('คลินิก'), 'section40_6');
    assert.strictEqual(mapCategoryToSection('ทนาย'), 'section40_6');
  });

  it('maps contracting keywords to section 40(7)', () => {
    assert.strictEqual(mapCategoryToSection('รับเหมา'), 'section40_7');
    assert.strictEqual(mapCategoryToSection('ก่อสร้าง'), 'section40_7');
  });

  it('defaults unmatched or business categories to section 40(8)', () => {
    assert.strictEqual(mapCategoryToSection('ขายของออนไลน์'), 'section40_8');
    assert.strictEqual(mapCategoryToSection('ร้านกาแฟ'), 'section40_8');
    assert.strictEqual(mapCategoryToSection('รายได้อื่นๆ'), 'section40_8');
    assert.strictEqual(mapCategoryToSection(''), 'section40_8');
    // @ts-expect-error - testing undefined/null category handling defensively
    assert.strictEqual(mapCategoryToSection(undefined), 'section40_8');
  });

  it('handles whitespace and case insensitivity', () => {
    assert.strictEqual(mapCategoryToSection('  SALARY  '), 'section40_1');
    assert.strictEqual(mapCategoryToSection('  FREELANCE  '), 'section40_2');
    assert.strictEqual(mapCategoryToSection('\tโบนัส\n'), 'section40_1');
  });

  it('aggregates INCOME transactions into respective 40(1)-40(8) buckets and ignores EXPENSE/TRANSFER', () => {
    const transactions = [
      { type: 'INCOME', category: 'เงินเดือน', amount: 50000 },
      { type: 'INCOME', category: 'โบนัส', amount: 100000 },
      { type: 'INCOME', category: 'ฟรีแลนซ์', amount: 25000 },
      { type: 'EXPENSE', category: 'อาหาร', amount: 300 },
      { type: 'TRANSFER', category: 'โอนย้ายเงิน', amount: 10000 },
      { type: 'INCOME', category: 'ค่าเช่าคอนโด', amount: 12000 },
      { type: 'INCOME', category: 'ขายเสื้อผ้าออนไลน์', amount: 8000 },
    ];
    const result = aggregateTransactionsToIncome(transactions);
    assert.strictEqual(result.section40_1, 150000);
    assert.strictEqual(result.section40_2, 25000);
    assert.strictEqual(result.section40_3, 0);
    assert.strictEqual(result.section40_4, 0);
    assert.strictEqual(result.section40_5, 12000);
    assert.strictEqual(result.section40_6, 0);
    assert.strictEqual(result.section40_7, 0);
    assert.strictEqual(result.section40_8, 8000);
  });

  it('returns zero for all sections when transactions list is empty or has no income', () => {
    const result = aggregateTransactionsToIncome([]);
    assert.strictEqual(result.section40_1, 0);
    assert.strictEqual(result.section40_2, 0);
    assert.strictEqual(result.section40_3, 0);
    assert.strictEqual(result.section40_4, 0);
    assert.strictEqual(result.section40_5, 0);
    assert.strictEqual(result.section40_6, 0);
    assert.strictEqual(result.section40_7, 0);
    assert.strictEqual(result.section40_8, 0);
  });
});

describe('checkTaxExemption', () => {
  it('detects mortgage cashback and loan keywords', () => {
    // Mortgage cashback note with GHB
    const res1 = checkTaxExemption('รายรับอื่นๆ', 'ส่วนต่างกู้บ้าน ธอส. 140,000');
    assert.deepStrictEqual(res1, { isExempt: true, reason: 'LOAN_CASHBACK' });

    // Category containing loan keywords
    assert.strictEqual(checkTaxExemption('เงินกู้').reason, 'LOAN_CASHBACK');
    assert.strictEqual(checkTaxExemption('สินเชื่อส่วนบุคคล').reason, 'LOAN_CASHBACK');
    assert.strictEqual(checkTaxExemption('กู้บ้าน').reason, 'LOAN_CASHBACK');

    // Note containing cashback or loan terms
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'Cashback ธอส.').reason, 'LOAN_CASHBACK');
    assert.strictEqual(checkTaxExemption('รายรับ', 'เงินทอนซื้อบ้าน').reason, 'LOAN_CASHBACK');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'เงินเหลือจากการกู้คอนโด').reason, 'LOAN_CASHBACK');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'วงเงินกู้ส่วนบุคคล').reason, 'LOAN_CASHBACK');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'home loan cashback').reason, 'LOAN_CASHBACK');
  });

  it('detects parents and family support keywords (Section 42(26))', () => {
    // Parents support note
    const res1 = checkTaxExemption('รายรับอื่นๆ', 'พ่อแม่ช่วยค่าใช้จ่าย');
    assert.deepStrictEqual(res1, { isExempt: true, reason: 'FAMILY_SUPPORT' });

    // Thai family keywords
    assert.strictEqual(checkTaxExemption('ครอบครัว').reason, 'FAMILY_SUPPORT');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'แม่ให้ค่าขนม').reason, 'FAMILY_SUPPORT');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'พ่อโอนเงินมาให้').reason, 'FAMILY_SUPPORT');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'เงินอุปการะบุพการี').reason, 'FAMILY_SUPPORT');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'โอนให้โดยเสน่หา').reason, 'FAMILY_SUPPORT');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'parent support').reason, 'FAMILY_SUPPORT');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'family gift').reason, 'FAMILY_SUPPORT');
  });

  it('detects cost-sharing and reimbursement keywords', () => {
    // Cost sharing note
    const res1 = checkTaxExemption('รายรับอื่นๆ', 'ช่วยค่าบ้าน 4000');
    assert.deepStrictEqual(res1, { isExempt: true, reason: 'COST_SHARING' });

    // Common cost sharing patterns
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'แชร์ค่าห้อง').reason, 'COST_SHARING');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'ช่วยผ่อนคอนโด').reason, 'COST_SHARING');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'หารค่าเน็ต').reason, 'COST_SHARING');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'reimburse ค่าเดินทาง').reason, 'COST_SHARING');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'คืนเงินค่าตั๋ว').reason, 'COST_SHARING');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'เพื่อนคืนเงินยืม').reason, 'COST_SHARING');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'สำรองจ่ายค่าส่วนกลาง').reason, 'COST_SHARING');
    assert.strictEqual(checkTaxExemption('อื่นๆ', 'cost sharing').reason, 'COST_SHARING');
  });

  it('detects excluded categories, transfers and refunds', () => {
    assert.deepStrictEqual(checkTaxExemption('โอนระหว่างบัญชี'), {
      isExempt: true,
      reason: 'REFUND_TRANSFER',
    });
    assert.deepStrictEqual(checkTaxExemption('เงินยกเว้นภาษี'), {
      isExempt: true,
      reason: 'REFUND_TRANSFER',
    });
    assert.deepStrictEqual(checkTaxExemption('เงินคืน'), {
      isExempt: true,
      reason: 'REFUND_TRANSFER',
    });
    assert.deepStrictEqual(checkTaxExemption('อื่นๆ', 'tax refund คืนเงินภาษี'), {
      isExempt: true,
      reason: 'REFUND_TRANSFER',
    });
  });

  it('returns non-exempt for normal salary, freelance, business and general notes', () => {
    assert.deepStrictEqual(checkTaxExemption('เงินเดือน', 'เงินเดือนประจำ'), {
      isExempt: false,
    });
    assert.deepStrictEqual(checkTaxExemption('ฟรีแลนซ์', 'งานออกแบบเว็บไซต์'), {
      isExempt: false,
    });
    assert.deepStrictEqual(checkTaxExemption('รับจ้าง', 'พัฒนาซอฟต์แวร์'), {
      isExempt: false,
    });
    assert.deepStrictEqual(checkTaxExemption('ค่าเช่า', 'ค่าเช่าห้องชุด ประจำเดือน'), {
      isExempt: false,
    });
    assert.deepStrictEqual(checkTaxExemption('ขายของออนไลน์', 'ขายเสื้อผ้า'), {
      isExempt: false,
    });
    // Food note should not be falsely matched as 'หาร'
    assert.deepStrictEqual(checkTaxExemption('ค่าอาหาร', 'อาหารกลางวัน'), {
      isExempt: false,
    });
  });

  it('handles empty, null or undefined gracefully', () => {
    assert.deepStrictEqual(checkTaxExemption(''), { isExempt: false });
    // @ts-expect-error - testing defensive handling
    assert.deepStrictEqual(checkTaxExemption(undefined, undefined), { isExempt: false });
    // @ts-expect-error - testing defensive handling
    assert.deepStrictEqual(checkTaxExemption(null, null), { isExempt: false });
  });
});

describe('categorizeTransactionsForTax', () => {
  it('accurately excludes auto-exempt transactions from syncedIncome', () => {
    const transactions = [
      {
        id: 'tx-1',
        date: '2026-01-25',
        type: 'INCOME',
        category: 'เงินเดือน',
        amount: 50000,
        note: 'เงินเดือน ม.ค.',
      },
      {
        id: 'tx-2',
        date: '2026-02-10',
        type: 'INCOME',
        category: 'รายรับอื่นๆ',
        amount: 140000,
        note: 'ส่วนต่างกู้บ้าน ธอส. 140,000',
      },
    ];

    const result = categorizeTransactionsForTax(transactions);

    assert.strictEqual(result.syncedIncome.section40_1, 50000);
    assert.strictEqual(result.syncedIncome.section40_8, 0);
    assert.strictEqual(result.totalTaxableIncome, 50000);
    assert.strictEqual(result.totalExemptIncome, 140000);
    assert.strictEqual(result.exemptTransactions.length, 1);
    assert.strictEqual(result.exemptTransactions[0].id, 'tx-2');
    assert.strictEqual(result.exemptTransactions[0].isExempt, true);
    assert.strictEqual(result.exemptTransactions[0].exemptionReason, 'LOAN_CASHBACK');
  });

  it('respects userExcludedIds to exclude specific transactions', () => {
    const transactions = [
      {
        id: 'tx-salary',
        date: '2026-01-25',
        type: 'INCOME',
        category: 'เงินเดือน',
        amount: 60000,
        note: 'เงินเดือน ม.ค.',
      },
      {
        id: 'tx-freelance',
        date: '2026-01-28',
        type: 'INCOME',
        category: 'ฟรีแลนซ์',
        amount: 25000,
        note: 'งานออกแบบ UI',
      },
    ];

    // User explicitly excluded tx-freelance
    const result = categorizeTransactionsForTax(transactions, ['tx-freelance']);

    assert.strictEqual(result.syncedIncome.section40_1, 60000);
    assert.strictEqual(result.syncedIncome.section40_2, 0);
    assert.strictEqual(result.totalTaxableIncome, 60000);
    assert.strictEqual(result.totalExemptIncome, 25000);
    assert.strictEqual(result.exemptTransactions.length, 1);
    assert.strictEqual(result.exemptTransactions[0].id, 'tx-freelance');
    assert.strictEqual(result.exemptTransactions[0].isUserExcluded, true);
    assert.strictEqual(result.exemptTransactions[0].section, 'section40_2');
  });

  it('correctly separates taxable and exempt transactions by section', () => {
    const transactions = [
      {
        id: 'tx-1',
        date: '2026-01-25',
        type: 'INCOME',
        category: 'เงินเดือน',
        amount: 50000,
        note: 'เงินเดือน ม.ค.',
      },
      {
        id: 'tx-2',
        date: '2026-02-01',
        type: 'INCOME',
        category: 'ฟรีแลนซ์',
        amount: 30000,
        note: 'ที่ปรึกษา',
      },
      {
        id: 'tx-3',
        date: '2026-02-15',
        type: 'INCOME',
        category: 'รายรับอื่นๆ',
        amount: 4000,
        note: 'ช่วยค่าบ้าน 4000',
      },
      {
        id: 'tx-4',
        date: '2026-03-01',
        type: 'INCOME',
        category: 'ค่าเช่าคอนโด',
        amount: 15000,
        note: 'ค่าเช่า มี.ค.',
      },
      {
        id: 'tx-5',
        date: '2026-03-10',
        type: 'INCOME',
        category: 'รายรับอื่นๆ',
        amount: 10000,
        note: 'พ่อแม่ช่วยค่าใช้จ่าย',
      },
    ];

    // User excluded tx-2 (freelance)
    const result = categorizeTransactionsForTax(transactions, new Set(['tx-2']));

    // Taxable grouped by section
    assert.strictEqual(result.transactionsBySection.section40_1.length, 1);
    assert.strictEqual(result.transactionsBySection.section40_1[0].id, 'tx-1');
    assert.strictEqual(result.transactionsBySection.section40_1[0].isExempt, false);
    assert.strictEqual(result.transactionsBySection.section40_1[0].isUserExcluded, false);

    assert.strictEqual(result.transactionsBySection.section40_2.length, 0); // tx-2 is user-excluded

    assert.strictEqual(result.transactionsBySection.section40_5.length, 1);
    assert.strictEqual(result.transactionsBySection.section40_5[0].id, 'tx-4');

    assert.strictEqual(result.transactionsBySection.section40_8.length, 0); // tx-3 and tx-5 are auto-exempt

    // Exempt transactions list
    assert.strictEqual(result.exemptTransactions.length, 3);
    const exemptIds = result.exemptTransactions.map((t) => t.id);
    assert.ok(exemptIds.includes('tx-2'));
    assert.ok(exemptIds.includes('tx-3'));
    assert.ok(exemptIds.includes('tx-5'));

    // Totals
    assert.strictEqual(result.syncedIncome.section40_1, 50000);
    assert.strictEqual(result.syncedIncome.section40_2, 0);
    assert.strictEqual(result.syncedIncome.section40_5, 15000);
    assert.strictEqual(result.syncedIncome.section40_8, 0);
    assert.strictEqual(result.totalTaxableIncome, 65000);
    assert.strictEqual(result.totalExemptIncome, 44000); // 30000 + 4000 + 10000
  });

  it('ignores non-INCOME transactions (EXPENSE and TRANSFER)', () => {
    const transactions = [
      {
        id: 'tx-inc',
        date: '2026-01-25',
        type: 'INCOME',
        category: 'เงินเดือน',
        amount: 50000,
        note: 'เงินเดือน',
      },
      {
        id: 'tx-exp',
        date: '2026-01-26',
        type: 'EXPENSE',
        category: 'ค่าอาหาร',
        amount: 500,
        note: 'อาหารเย็น',
      },
      {
        id: 'tx-trn',
        date: '2026-01-27',
        type: 'TRANSFER',
        category: 'โอนย้ายเงิน',
        amount: 10000,
        note: 'ย้ายเงิน',
      },
    ];

    const result = categorizeTransactionsForTax(transactions);
    assert.strictEqual(result.totalTaxableIncome, 50000);
    assert.strictEqual(result.totalExemptIncome, 0);
    assert.strictEqual(result.transactionsBySection.section40_1.length, 1);
    assert.strictEqual(result.exemptTransactions.length, 0);
  });

  it('returns empty structures when transactions list is empty', () => {
    const result = categorizeTransactionsForTax([]);
    assert.strictEqual(result.totalTaxableIncome, 0);
    assert.strictEqual(result.totalExemptIncome, 0);
    assert.strictEqual(result.exemptTransactions.length, 0);
    assert.strictEqual(result.transactionsBySection.section40_1.length, 0);
    assert.strictEqual(result.transactionsBySection.section40_8.length, 0);
    assert.strictEqual(result.syncedIncome.section40_1, 0);
    assert.strictEqual(result.syncedIncome.section40_8, 0);
  });

  it('does not duplicate exempt transaction if it is both auto-exempt and user-excluded', () => {
    const transactions = [
      {
        id: 'tx-loan-1',
        date: '2026-02-10',
        type: 'INCOME',
        category: 'รายรับอื่นๆ',
        amount: 100000,
        note: 'ส่วนต่างกู้บ้าน ธอส. 100,000',
      },
    ];

    // User also explicitly excluded this loan transaction
    const result = categorizeTransactionsForTax(transactions, ['tx-loan-1']);

    assert.strictEqual(result.exemptTransactions.length, 1);
    assert.strictEqual(result.exemptTransactions[0].id, 'tx-loan-1');
    assert.strictEqual(result.exemptTransactions[0].isExempt, true);
    assert.strictEqual(result.exemptTransactions[0].isUserExcluded, true);
    assert.strictEqual(result.totalExemptIncome, 100000);
    assert.strictEqual(result.totalTaxableIncome, 0);
  });

  it('handles empty or undefined userExcludedIds gracefully', () => {
    const transactions = [
      {
        id: 'tx-1',
        date: '2026-01-25',
        type: 'INCOME',
        category: 'เงินเดือน',
        amount: 50000,
      },
    ];

    const res1 = categorizeTransactionsForTax(transactions, undefined);
    assert.strictEqual(res1.syncedIncome.section40_1, 50000);
    assert.strictEqual(res1.exemptTransactions.length, 0);

    const res2 = categorizeTransactionsForTax(transactions, []);
    assert.strictEqual(res2.syncedIncome.section40_1, 50000);

    const res3 = categorizeTransactionsForTax(transactions, new Set());
    assert.strictEqual(res3.syncedIncome.section40_1, 50000);
  });

  it('supports multiple user exclusions across various sections', () => {
    const transactions = [
      {
        id: 'tx-sal',
        date: '2026-01-25',
        type: 'INCOME',
        category: 'เงินเดือน',
        amount: 50000,
      },
      {
        id: 'tx-free',
        date: '2026-02-01',
        type: 'INCOME',
        category: 'ฟรีแลนซ์',
        amount: 20000,
      },
      {
        id: 'tx-rent',
        date: '2026-03-01',
        type: 'INCOME',
        category: 'ค่าเช่า',
        amount: 15000,
      },
      {
        id: 'tx-biz',
        date: '2026-04-01',
        type: 'INCOME',
        category: 'ขายของ',
        amount: 10000,
      },
    ];

    // Exclude salary and rent
    const result = categorizeTransactionsForTax(transactions, ['tx-sal', 'tx-rent']);

    assert.strictEqual(result.syncedIncome.section40_1, 0);
    assert.strictEqual(result.syncedIncome.section40_2, 20000);
    assert.strictEqual(result.syncedIncome.section40_5, 0);
    assert.strictEqual(result.syncedIncome.section40_8, 10000);
    assert.strictEqual(result.totalTaxableIncome, 30000);
    assert.strictEqual(result.totalExemptIncome, 65000);
    assert.strictEqual(result.exemptTransactions.length, 2);
  });
});

describe('serializeExcludedTransactionIds and deserializeExcludedTransactionIds', () => {
  it('serializes array of strings to JSON string', () => {
    const ids = ['tx-1', 'tx-2', 'tx-3'];
    const serialized = serializeExcludedTransactionIds(ids);
    assert.strictEqual(serialized, JSON.stringify(ids));
  });

  it('serializes empty array, undefined or non-array to empty array JSON string', () => {
    assert.strictEqual(serializeExcludedTransactionIds([]), '[]');
    assert.strictEqual(serializeExcludedTransactionIds(undefined), '[]');
    // @ts-expect-error - testing invalid inputs
    assert.strictEqual(serializeExcludedTransactionIds(null), '[]');
    // @ts-expect-error - testing invalid inputs
    assert.strictEqual(serializeExcludedTransactionIds('invalid'), '[]');
  });

  it('deserializes JSON string back to string array', () => {
    const jsonStr = '["tx-10","tx-20"]';
    const deserialized = deserializeExcludedTransactionIds(jsonStr);
    assert.deepStrictEqual(deserialized, ['tx-10', 'tx-20']);
  });

  it('accepts raw array and maps elements to string', () => {
    const raw = ['tx-1', 123];
    const deserialized = deserializeExcludedTransactionIds(raw);
    assert.deepStrictEqual(deserialized, ['tx-1', '123']);
  });

  it('handles empty, null, undefined or malformed JSON gracefully', () => {
    assert.deepStrictEqual(deserializeExcludedTransactionIds(''), []);
    assert.deepStrictEqual(deserializeExcludedTransactionIds(null), []);
    assert.deepStrictEqual(deserializeExcludedTransactionIds(undefined), []);
    assert.deepStrictEqual(deserializeExcludedTransactionIds('{ "invalid": true }'), []);
    assert.deepStrictEqual(deserializeExcludedTransactionIds('not a json'), []);
  });

  it('roundtrips excluded IDs through serialization and deserialization', () => {
    const originalIds = ['tx-ghb-140k', 'tx-mom-50k', 'tx-reimburse-4k'];
    const serialized = serializeExcludedTransactionIds(originalIds);
    const deserialized = deserializeExcludedTransactionIds(serialized);
    assert.deepStrictEqual(deserialized, originalIds);

    // Feed roundtripped IDs into categorizeTransactionsForTax
    const transactions = [
      {
        id: 'tx-ghb-140k',
        date: '2026-02-10',
        type: 'INCOME',
        category: 'เงินเดือน',
        amount: 140000,
      },
      {
        id: 'tx-regular',
        date: '2026-02-25',
        type: 'INCOME',
        category: 'เงินเดือน',
        amount: 60000,
      },
    ];

    const result = categorizeTransactionsForTax(transactions, deserialized);
    assert.strictEqual(result.syncedIncome.section40_1, 60000);
    assert.strictEqual(result.exemptTransactions.length, 1);
    assert.strictEqual(result.exemptTransactions[0].id, 'tx-ghb-140k');
  });
});


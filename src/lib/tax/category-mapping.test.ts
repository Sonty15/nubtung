import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error - node test runner requires .ts extension for ESM strip-types
import { mapCategoryToSection, aggregateTransactionsToIncome } from './category-mapping.ts';

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

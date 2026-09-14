import type { IncomeBySection } from './tax-types.ts';
// @ts-expect-error - node test runner requires .ts extension for ESM strip-types
import { defaultIncome } from './tax-engine.ts';

export function mapCategoryToSection(categoryName: string): keyof IncomeBySection {
  const norm = (categoryName || '').toLowerCase().trim();

  // 40(1) Salary & Bonus
  if (
    norm.includes('เงินเดือน') ||
    norm.includes('salary') ||
    norm.includes('โบนัส') ||
    norm.includes('bonus') ||
    norm.includes('เบี้ยเลี้ยง')
  ) {
    return 'section40_1';
  }

  // 40(2) Freelance & Services
  if (
    norm.includes('ฟรีแลนซ์') ||
    norm.includes('freelance') ||
    norm.includes('รับจ้าง') ||
    norm.includes('ค่านายหน้า') ||
    norm.includes('คอมมิชชั่น') ||
    norm.includes('จ้างทำของ')
  ) {
    return 'section40_2';
  }

  // 40(3) Royalties & IP
  if (norm.includes('ลิขสิทธิ์') || norm.includes('royalty') || norm.includes('สิทธิบัตร')) {
    return 'section40_3';
  }

  // 40(4) Dividends & Interest
  if (
    norm.includes('ดอกเบี้ย') ||
    norm.includes('ปันผล') ||
    norm.includes('dividend') ||
    norm.includes('interest') ||
    norm.includes('คริปโต') ||
    norm.includes('crypto')
  ) {
    return 'section40_4';
  }

  // 40(5) Rent
  if (norm.includes('ค่าเช่า') || norm.includes('rent') || norm.includes('เช่าบ้าน')) {
    return 'section40_5';
  }

  // 40(6) Liberal professions
  if (norm.includes('วิชาชีพอิสระ') || norm.includes('คลินิก') || norm.includes('ทนาย')) {
    return 'section40_6';
  }

  // 40(7) Contracting / Construction
  if (norm.includes('รับเหมา') || norm.includes('ก่อสร้าง')) {
    return 'section40_7';
  }

  // Default to 40(8) Business / Commerce / Other
  return 'section40_8';
}

export function aggregateTransactionsToIncome(
  transactions: Array<{ type: string; category: string; amount: number }>
): IncomeBySection {
  const result: IncomeBySection = { ...defaultIncome };

  for (const tx of transactions) {
    if (tx.type !== 'INCOME') continue;
    const section = mapCategoryToSection(tx.category);
    result[section] = (result[section] || 0) + (Number(tx.amount) || 0);
  }

  return result;
}

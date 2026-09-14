# Personal Income Tax System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive Thai personal income tax calculation and planning subsystem for Nubtang that automatically aggregates income from transactions, allows manual customization of deductions, computes tax according to Thai Revenue Department rules (including progressive brackets and 0.5% flat assessment), and persists data to a dedicated Google Sheet tab.

**Architecture:** A pure TypeScript calculation engine (`tax-engine.ts`) handles tax law math with 100% test coverage. Next.js API endpoints (`/api/tax`) orchestrate transaction aggregation from Google Sheets and upsert tax profiles to a new `📑 ข้อมูลภาษี` tab. The client-side dashboard (`/tax`) offers real-time calculation, interactive deduction forms with regulatory limit validation, and educational tax bracket breakdowns.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Google Sheets API (`googleapis`), Lucide React icons, Node.js built-in test runner (`node --test`).

**Spec:** [docs/superpowers/specs/2026-09-14-personal-income-tax-system-design.md](file:///home/sonty/Documents/Personal/nubtang/docs/superpowers/specs/2026-09-14-personal-income-tax-system-design.md)

## Global Constraints

- Must strictly follow Thai Revenue Code (ประมวลรัษฎากร) for progressive tax brackets (0% to 35%) and 0.5% flat tax on non-40(1) income >= 120,000 THB.
- Expenses for 40(1) and 40(2) are combined and capped at 50% max 100,000 THB.
- Combined retirement allowance (RMF + SSF + PVD/GPF + Pension Life Insurance) capped at 500,000 THB; ThaiESG is separate and capped at 300,000 THB (max 30% of income).
- Health insurance capped at 25,000 THB and combined with general life insurance max 100,000 THB.
- Donations calculated after all expenses and other deductions, capped at 10% of remaining income (education/sports/public hospital x2).
- Google Sheets tab name must be `📑 ข้อมูลภาษี` with headers adhering to the spec.
- UI must support both light and dark modes matching existing Nubtang theme.

---

### Task 1: Tax Types & Pure Calculation Engine

**Files:**
- Create: `src/lib/tax/tax-types.ts`
- Create: `src/lib/tax/tax-engine.ts`
- Test: `src/lib/tax/tax-engine.test.ts`

**Interfaces:**
- Produces:
  - `IncomeBySection`: `{ section40_1: number, section40_2: number, section40_3: number, section40_4: number, section40_5: number, section40_6: number, section40_7: number, section40_8: number }`
  - `TaxDeductions`: Personal, family, insurance, retirement, property, donation inputs.
  - `TaxCalculationResult`: Breakdown of expenses, deductions, net income, progressive tax, flat 0.5% tax, final tax, withholding, payable/refund, brackets.
  - `calculateTax(income: IncomeBySection, deductions: TaxDeductions, withholdingTax: number): TaxCalculationResult`

- [ ] **Step 1: Write the failing test for tax calculation engine**

Create `src/lib/tax/tax-engine.test.ts`:
```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTax, defaultDeductions, defaultIncome } from './tax-engine.ts';

describe('Tax Engine - Thai Personal Income Tax Calculation', () => {
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
    const deductions = { ...defaultDeductions, personal: 60000, generalDonation: 50000 };
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test src/lib/tax/tax-engine.test.ts`
Expected: FAIL (Cannot find module `./tax-engine.ts`)

- [ ] **Step 3: Implement `tax-types.ts` and `tax-engine.ts`**

Create `src/lib/tax/tax-types.ts`:
```typescript
export interface IncomeBySection {
  section40_1: number; // เงินเดือน โบนัส
  section40_2: number; // ฟรีแลนซ์ รับจ้าง
  section40_3: number; // ลิขสิทธิ์
  section40_4: number; // ดอกเบี้ย เงินปันผล
  section40_5: number; // ค่าเช่า
  section40_6: number; // วิชาชีพอิสระ
  section40_7: number; // รับเหมา
  section40_8: number; // ขายของ ธุรกิจ อื่นๆ
}

export interface TaxDeductions {
  // ตนเองและครอบครัว
  personal: number; // ตนเอง 60,000
  spouse: number; // คู่สมรสไม่มีเงินได้ 60,000
  childCount: number; // บุตรคนละ 30,000
  child2018Count: number; // บุตรคนที่ 2 ขึ้นไปเกิดปี 61 เป็นต้นไป คนละ 60,000
  parentCount: number; // บิดามารดา คนละ 30,000 (สูงสุด 4 คน)
  disabledCount: number; // ผู้พิการ คนละ 60,000

  // ประกันและการออม
  socialSecurity: number; // ประกันสังคม max 9,000
  lifeInsurance: number; // ประกันชีวิตทั่วไป max 100,000
  healthInsurance: number; // ประกันสุขภาพตนเอง max 25,000 (รวมชีวิต max 100,000)
  parentHealthInsurance: number; // ประกันสุขภาพพ่อแม่ max 15,000

  // กองทุนเกษียณและ ThaiESG
  rmf: number; // max 30% of income, max 500k
  ssf: number; // max 30% of income, max 200k
  pvd: number; // กองทุนสำรองเลี้ยงชีพ / กบข. max 15% of income, max 500k
  pensionInsurance: number; // ประกันบำนาญ max 15% of income, max 200k
  // (rmf + ssf + pvd + pensionInsurance <= 500k)
  thaiEsg: number; // ThaiESG max 30% of income, max 300k

  // อสังหาฯ และกระตุ้นเศรษฐกิจ
  homeLoanInterest: number; // ดอกเบี้ยกู้ซื้อบ้าน max 100,000
  easyEReceipt: number; // ช้อปดีมีคืน / Easy E-Receipt

  // เงินบริจาค
  doubleDonation: number; // บริจาคการศึกษา กีฬา รพ.รัฐ (ลดหย่อน 2 เท่า)
  generalDonation: number; // บริจาคทั่วไป
}

export interface TaxBracketDetail {
  tierName: string;
  minIncome: number;
  maxIncome: number;
  rate: number;
  taxableInTier: number;
  taxInTier: number;
  isCurrentTier: boolean;
}

export interface TaxCalculationResult {
  totalIncome: number;
  incomeBySection: IncomeBySection;
  expensesBySection: Record<keyof IncomeBySection, number>;
  totalDeductibleExpenses: number;
  incomeAfterExpenses: number;

  deductionsBreakdown: {
    personalFamily: number;
    insuranceSavings: number;
    retirementGroup: number;
    thaiEsg: number;
    propertyEconomy: number;
    donations: number;
  };
  totalDeductions: number;

  netTaxableIncome: number;
  taxBrackets: TaxBracketDetail[];
  progressiveTax: number;

  nonSalaryIncome: number;
  flatTax05: number;
  flatTax05Applicable: boolean;

  finalTax: number;
  taxMethodUsed: 'progressive' | 'flat05';

  withholdingTax: number;
  netTaxPayable: number;
  isRefund: boolean;
  effectiveTaxRate: number;
}
```

Create `src/lib/tax/tax-engine.ts`:
```typescript
import {
  IncomeBySection,
  TaxCalculationResult,
  TaxDeductions,
  TaxBracketDetail,
} from './tax-types.ts';

export const defaultIncome: IncomeBySection = {
  section40_1: 0,
  section40_2: 0,
  section40_3: 0,
  section40_4: 0,
  section40_5: 0,
  section40_6: 0,
  section40_7: 0,
  section40_8: 0,
};

export const defaultDeductions: TaxDeductions = {
  personal: 60000,
  spouse: 0,
  childCount: 0,
  child2018Count: 0,
  parentCount: 0,
  disabledCount: 0,

  socialSecurity: 0,
  lifeInsurance: 0,
  healthInsurance: 0,
  parentHealthInsurance: 0,

  rmf: 0,
  ssf: 0,
  pvd: 0,
  pensionInsurance: 0,
  thaiEsg: 0,

  homeLoanInterest: 0,
  easyEReceipt: 0,

  doubleDonation: 0,
  generalDonation: 0,
};

export const TAX_BRACKETS = [
  { tierName: '0 - 150,000', minIncome: 0, maxIncome: 150000, rate: 0.0 },
  { tierName: '150,001 - 300,000', minIncome: 150000, maxIncome: 300000, rate: 0.05 },
  { tierName: '300,001 - 500,000', minIncome: 300000, maxIncome: 500000, rate: 0.1 },
  { tierName: '500,001 - 750,000', minIncome: 500000, maxIncome: 750000, rate: 0.15 },
  { tierName: '750,001 - 1,000,000', minIncome: 750000, maxIncome: 100000, rate: 0.2 },
  { tierName: '1,000,001 - 2,000,000', minIncome: 1000000, maxIncome: 2000000, rate: 0.25 },
  { tierName: '2,000,001 - 5,000,000', minIncome: 2000000, maxIncome: 5000000, rate: 0.3 },
  { tierName: 'มากกว่า 5,000,000', minIncome: 5000000, maxIncome: Infinity, rate: 0.35 },
];

export function calculateTax(
  income: IncomeBySection,
  deductions: TaxDeductions,
  withholdingTax: number = 0
): TaxCalculationResult {
  const totalIncome =
    (income.section40_1 || 0) +
    (income.section40_2 || 0) +
    (income.section40_3 || 0) +
    (income.section40_4 || 0) +
    (income.section40_5 || 0) +
    (income.section40_6 || 0) +
    (income.section40_7 || 0) +
    (income.section40_8 || 0);

  // 1. Calculate Deductible Expenses
  // 40(1) + 40(2) 50% combined max 100k
  const s40_1_2 = (income.section40_1 || 0) + (income.section40_2 || 0);
  const exp40_1_2 = Math.min(s40_1_2 * 0.5, 100000);
  const exp40_1 = s40_1_2 > 0 ? (exp40_1_2 * (income.section40_1 || 0)) / s40_1_2 : 0;
  const exp40_2 = s40_1_2 > 0 ? (exp40_1_2 * (income.section40_2 || 0)) / s40_1_2 : 0;

  // 40(3) 50% max 100k
  const exp40_3 = Math.min((income.section40_3 || 0) * 0.5, 100000);
  // 40(4) 0%
  const exp40_4 = 0;
  // 40(5) Flat 30%
  const exp40_5 = (income.section40_5 || 0) * 0.3;
  // 40(6) Flat 30%
  const exp40_6 = (income.section40_6 || 0) * 0.3;
  // 40(7) Flat 60%
  const exp40_7 = (income.section40_7 || 0) * 0.6;
  // 40(8) Flat 60%
  const exp40_8 = (income.section40_8 || 0) * 0.6;

  const totalDeductibleExpenses =
    exp40_1_2 + exp40_3 + exp40_4 + exp40_5 + exp40_6 + exp40_7 + exp40_8;

  const incomeAfterExpenses = Math.max(0, totalIncome - totalDeductibleExpenses);

  // 2. Calculate Deductions with Legal Caps
  // Group 1: Personal & Family
  const personal = 60000;
  const spouse = deductions.spouse ? 60000 : 0;
  const child = (deductions.childCount || 0) * 30000;
  const child2018 = (deductions.child2018Count || 0) * 60000;
  const parent = Math.min(deductions.parentCount || 0, 4) * 30000;
  const disabled = (deductions.disabledCount || 0) * 60000;
  const personalFamily = personal + spouse + child + child2018 + parent + disabled;

  // Group 2: Insurance & Savings
  const socialSecurity = Math.min(deductions.socialSecurity || 0, 9000);
  const healthInsurance = Math.min(deductions.healthInsurance || 0, 25000);
  const lifeAndHealth = Math.min(
    (deductions.lifeInsurance || 0) + healthInsurance,
    100000
  );
  const parentHealthInsurance = Math.min(deductions.parentHealthInsurance || 0, 15000);
  const insuranceSavings = socialSecurity + lifeAndHealth + parentHealthInsurance;

  // Group 3: Retirement Funds (Cap 500,000)
  const rmfCapped = Math.min(
    deductions.rmf || 0,
    totalIncome * 0.3,
    500000
  );
  const ssfCapped = Math.min(
    deductions.ssf || 0,
    totalIncome * 0.3,
    200000
  );
  const pvdCapped = Math.min(
    deductions.pvd || 0,
    totalIncome * 0.15,
    500000
  );
  const pensionCapped = Math.min(
    deductions.pensionInsurance || 0,
    totalIncome * 0.15,
    200000
  );
  const retirementGroup = Math.min(
    rmfCapped + ssfCapped + pvdCapped + pensionCapped,
    500000
  );

  // ThaiESG (Cap 300,000, 30% of income, independent of retirement 500k)
  const thaiEsg = Math.min(
    deductions.thaiEsg || 0,
    totalIncome * 0.3,
    300000
  );

  // Group 4: Property & Economy
  const homeLoanInterest = Math.min(deductions.homeLoanInterest || 0, 100000);
  const easyEReceipt = deductions.easyEReceipt || 0;
  const propertyEconomy = homeLoanInterest + easyEReceipt;

  // Deductions before donations
  const deductionsBeforeDonation =
    personalFamily + insuranceSavings + retirementGroup + thaiEsg + propertyEconomy;

  // Remaining income for donation cap calculation
  const remainingBeforeDonation = Math.max(
    0,
    incomeAfterExpenses - deductionsBeforeDonation
  );

  // Group 5: Donations (Max 10% of remaining income)
  const maxDonationAllowed = remainingBeforeDonation * 0.1;
  const doubleDonationClaimed = (deductions.doubleDonation || 0) * 2;
  const generalDonationClaimed = deductions.generalDonation || 0;
  const totalDonationClaimed = doubleDonationClaimed + generalDonationClaimed;
  const donations = Math.min(totalDonationClaimed, maxDonationAllowed);

  const totalDeductions = deductionsBeforeDonation + donations;
  const netTaxableIncome = Math.max(0, incomeAfterExpenses - totalDeductions);

  // 3. Progressive Tax Calculation
  let progressiveTax = 0;
  let remainingIncomeToTax = netTaxableIncome;

  const taxBrackets: TaxBracketDetail[] = TAX_BRACKETS.map((bracket) => {
    const tierSpan = bracket.maxIncome - bracket.minIncome;
    let taxableInTier = 0;

    if (netTaxableIncome > bracket.minIncome) {
      if (bracket.maxIncome === Infinity) {
        taxableInTier = netTaxableIncome - bracket.minIncome;
      } else {
        taxableInTier = Math.min(netTaxableIncome - bracket.minIncome, tierSpan);
      }
    }

    const taxInTier = taxableInTier * bracket.rate;
    progressiveTax += taxInTier;

    const isCurrentTier =
      netTaxableIncome > bracket.minIncome &&
      (bracket.maxIncome === Infinity || netTaxableIncome <= bracket.maxIncome);

    return {
      tierName: bracket.tierName,
      minIncome: bracket.minIncome,
      maxIncome: bracket.maxIncome,
      rate: bracket.rate,
      taxableInTier,
      taxInTier,
      isCurrentTier,
    };
  });

  // 4. Flat Tax 0.5% (for non-40(1) >= 120k)
  const nonSalaryIncome = totalIncome - (income.section40_1 || 0);
  let flatTax05 = 0;
  let flatTax05Applicable = false;

  if (nonSalaryIncome >= 120000) {
    const computed05 = nonSalaryIncome * 0.005;
    if (computed05 > 5000) {
      flatTax05 = computed05;
      flatTax05Applicable = true;
    }
  }

  // 5. Final Tax & Method Selection
  let finalTax = progressiveTax;
  let taxMethodUsed: 'progressive' | 'flat05' = 'progressive';

  if (flatTax05Applicable && flatTax05 > progressiveTax) {
    finalTax = flatTax05;
    taxMethodUsed = 'flat05';
  }

  // 6. Net Tax Payable / Refund
  const netTaxPayable = finalTax - (withholdingTax || 0);
  const isRefund = netTaxPayable < 0;
  const effectiveTaxRate = totalIncome > 0 ? (finalTax / totalIncome) * 100 : 0;

  return {
    totalIncome,
    incomeBySection: income,
    expensesBySection: {
      section40_1: exp40_1,
      section40_2: exp40_2,
      section40_3: exp40_3,
      section40_4: exp40_4,
      section40_5: exp40_5,
      section40_6: exp40_6,
      section40_7: exp40_7,
      section40_8: exp40_8,
    },
    totalDeductibleExpenses,
    incomeAfterExpenses,
    deductionsBreakdown: {
      personalFamily,
      insuranceSavings,
      retirementGroup,
      thaiEsg,
      propertyEconomy,
      donations,
    },
    totalDeductions,
    netTaxableIncome,
    taxBrackets,
    progressiveTax,
    nonSalaryIncome,
    flatTax05,
    flatTax05Applicable,
    finalTax,
    taxMethodUsed,
    withholdingTax: withholdingTax || 0,
    netTaxPayable,
    isRefund,
    effectiveTaxRate,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test src/lib/tax/tax-engine.test.ts`
Expected: PASS (6 passed)

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lib/tax/tax-types.ts src/lib/tax/tax-engine.ts src/lib/tax/tax-engine.test.ts
git commit -m "feat(tax): implement pure Thai personal income tax calculation engine"
```

---

### Task 2: Category to Tax Mapping Logic

**Files:**
- Create: `src/lib/tax/category-mapping.ts`
- Test: `src/lib/tax/category-mapping.test.ts`

**Interfaces:**
- Produces:
  - `mapCategoryToSection(categoryName: string): keyof IncomeBySection`
  - `aggregateTransactionsToIncome(transactions: Array<{ type: string, category: string, amount: number }>): IncomeBySection`

- [ ] **Step 1: Write the failing test for category mapping**

Create `src/lib/tax/category-mapping.test.ts`:
```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapCategoryToSection, aggregateTransactionsToIncome } from './category-mapping.ts';

describe('Category to Tax Mapping', () => {
  it('maps salary keywords to section 40(1)', () => {
    assert.strictEqual(mapCategoryToSection('เงินเดือน'), 'section40_1');
    assert.strictEqual(mapCategoryToSection('โบนัส'), 'section40_1');
    assert.strictEqual(mapCategoryToSection('Salary'), 'section40_1');
  });

  it('maps freelance and commission keywords to section 40(2)', () => {
    assert.strictEqual(mapCategoryToSection('ฟรีแลนซ์'), 'section40_2');
    assert.strictEqual(mapCategoryToSection('รับจ้าง'), 'section40_2');
    assert.strictEqual(mapCategoryToSection('ค่านายหน้า'), 'section40_2');
  });

  it('aggregates INCOME transactions into respective 40(1)-40(8) buckets and ignores EXPENSE/TRANSFER', () => {
    const transactions = [
      { type: 'INCOME', category: 'เงินเดือน', amount: 50000 },
      { type: 'INCOME', category: 'โบนัส', amount: 100000 },
      { type: 'INCOME', category: 'ฟรีแลนซ์', amount: 25000 },
      { type: 'EXPENSE', category: 'อาหาร', amount: 300 },
      { type: 'TRANSFER', category: 'โอนย้ายเงิน', amount: 10000 },
    ];
    const result = aggregateTransactionsToIncome(transactions);
    assert.strictEqual(result.section40_1, 150000);
    assert.strictEqual(result.section40_2, 25000);
    assert.strictEqual(result.section40_8, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test src/lib/tax/category-mapping.test.ts`
Expected: FAIL (Cannot find module `./category-mapping.ts`)

- [ ] **Step 3: Implement `src/lib/tax/category-mapping.ts`**

```typescript
import { IncomeBySection } from './tax-types.ts';
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test src/lib/tax/category-mapping.test.ts`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit Task 2**

```bash
git add src/lib/tax/category-mapping.ts src/lib/tax/category-mapping.test.ts
git commit -m "feat(tax): implement category to tax section mapping and aggregation"
```

---

### Task 3: Google Sheets Tax Tab Storage (`📑 ข้อมูลภาษี`)

**Files:**
- Modify: `src/lib/google/sheets.ts`

**Interfaces:**
- Produces:
  - `ensureTaxSheetExists(): Promise<void>`
  - `getTaxProfile(year: number): Promise<{ year: number, income: IncomeBySection, deductions: TaxDeductions, withholdingTax: number } | null>`
  - `saveTaxProfile(taxResult: TaxCalculationResult, rawDeductions: TaxDeductions): Promise<void>`

- [ ] **Step 1: Check existing `src/lib/google/sheets.ts` structure and functions**

Read lines where sheet tabs and append/update operations are implemented in `src/lib/google/sheets.ts`.

- [ ] **Step 2: Add Tax Tab Constants & Helper Functions to `src/lib/google/sheets.ts`**

Define sheet name `SHEET_TAX = '📑 ข้อมูลภาษี'`.
Headers:
```typescript
const TAX_HEADERS = [
  'ปีภาษี',
  'เงินได้พึงประเมินรวม',
  '40(1) เงินเดือน',
  '40(2) ฟรีแลนซ์/รับจ้าง',
  '40(3) ค่าลิขสิทธิ์',
  '40(4) ดอกเบี้ย/ปันผล',
  '40(5) ค่าเช่า',
  '40(6) วิชาชีพอิสระ',
  '40(7) รับเหมา',
  '40(8) อื่นๆ/ธุรกิจ',
  'ค่าใช้จ่ายที่หักได้',
  'ลดหย่อนตนเองและครอบครัว',
  'ลดหย่อนประกันและการออม',
  'ลดหย่อนกองทุนเกษียณและThaiESG',
  'ลดหย่อนอสังหาฯและมาตรการรัฐ',
  'เงินบริจาคที่หักได้',
  'เงินได้สุทธิ',
  'ภาษีที่คำนวณได้',
  'ภาษีหัก ณ ที่จ่าย',
  'ภาษีที่ต้องจ่ายเพิ่ม (คืน)',
  'รายละเอียดค่าลดหย่อน (JSON)',
  'อัปเดตล่าสุด',
];
```

Implement:
1. `ensureTaxSheetExists()`: Checks if `📑 ข้อมูลภาษี` exists in spreadsheet sheets. If not, addSheet with title `📑 ข้อมูลภาษี` and write header row.
2. `getTaxProfile(year: number)`:
   - Call `ensureTaxSheetExists()`.
   - Read range `'📑 ข้อมูลภาษี'!A2:V`.
   - Find row where column 0 matches `String(year)`.
   - Parse column 20 (`JSON`) to restore deductions object, parse income columns, return restored profile or null.
3. `saveTaxProfile(taxResult: TaxCalculationResult, deductions: TaxDeductions, year: number)`:
   - Call `ensureTaxSheetExists()`.
   - Read range `'📑 ข้อมูลภาษี'!A2:V`.
   - Find row index matching `year`.
   - If found: update row range `'📑 ข้อมูลภาษี'!A{row}:V{row}`.
   - If not found: append row to `'📑 ข้อมูลภาษี'!A:V`.

- [ ] **Step 3: Run TypeScript compiler check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 3**

```bash
git add src/lib/google/sheets.ts
git commit -m "feat(tax): add Google Sheets tax tab persistence and retrieval"
```

---

### Task 4: Tax API Route (`/api/tax`)

**Files:**
- Create: `src/app/api/tax/route.ts`

**Interfaces:**
- Produces:
  - `GET /api/tax?year=YYYY`: Returns `{ year, syncedIncome, savedProfile, calculated }`
  - `POST /api/tax`: Accepts `{ year, income, deductions, withholdingTax }`, calculates tax, saves to Google Sheets, and returns calculation result.

- [ ] **Step 1: Implement `src/app/api/tax/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getTransactions, getTaxProfile, saveTaxProfile } from '@/lib/google/sheets';
import { calculateTax, defaultDeductions, defaultIncome } from '@/lib/tax/tax-engine';
import { aggregateTransactionsToIncome } from '@/lib/tax/category-mapping';
import { TaxDeductions, IncomeBySection } from '@/lib/tax/tax-types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    // 1. Fetch transactions for the year from Google Sheets
    const transactions = await getTransactions();
    const yearTransactions = transactions.filter((tx) => {
      if (!tx.date) return false;
      const txYear = new Date(tx.date).getFullYear();
      return txYear === year;
    });

    const syncedIncome = aggregateTransactionsToIncome(yearTransactions);

    // 2. Fetch saved profile from Sheet if available
    let savedProfile = null;
    try {
      savedProfile = await getTaxProfile(year);
    } catch (sheetErr) {
      console.warn('Could not fetch saved tax profile:', sheetErr);
    }

    const initialIncome: IncomeBySection = savedProfile?.income || syncedIncome;
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
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit Task 4**

```bash
git add src/app/api/tax/route.ts
git commit -m "feat(tax): implement tax calculation and persistence API endpoints"
```

---

### Task 5: Frontend Tax Components

**Files:**
- Create: `src/components/Tax/TaxSummaryCards.tsx`
- Create: `src/components/Tax/TaxIncomeForm.tsx`
- Create: `src/components/Tax/TaxDeductionsForm.tsx`
- Create: `src/components/Tax/TaxBracketTable.tsx`

**Interfaces:**
- Consumes: `TaxCalculationResult`, `IncomeBySection`, `TaxDeductions`
- Produces: Reusable UI components styled with Tailwind CSS supporting light/dark theme.

- [ ] **Step 1: Implement `src/components/Tax/TaxSummaryCards.tsx`**

Displays 4 standard metrics (Total Income, Deductible Expenses, Total Deductions, Net Taxable Income) and 1 prominent Payable/Refund Card (green with checkmark if refund, orange/red with alert if payable).

- [ ] **Step 2: Implement `src/components/Tax/TaxIncomeForm.tsx`**

Displays inputs for 40(1) through 40(8). Includes:
- Indicator when income is auto-synced from transactions.
- Quick toggle to reset to synced amounts or customize.
- Live badge showing deductible expense percentage/amount per category.

- [ ] **Step 3: Implement `src/components/Tax/TaxDeductionsForm.tsx`**

Organized into 4 tabs/accordion sections:
1. Personal & Family (Self 60k fixed, Spouse, Child count, Parent count, Disabled count).
2. Insurance & Savings (Social security with 9k cap, Life + Health with 100k cap, Parent health with 15k cap).
3. Retirement Funds & ThaiESG (RMF, SSF, PVD, Pension with combined 500k visual progress bar; ThaiESG with 300k cap).
4. Housing Interest, Easy E-Receipt, Donations (x2 & general), and Withholding Tax.

- [ ] **Step 4: Implement `src/components/Tax/TaxBracketTable.tsx`**

Displays:
- Full 8-tier progressive tax rate table (0% - 35%) with highlight on the user's current bracket.
- Method comparison callout: Progressive vs Flat 0.5% with legal rationale.
- Tax Optimization Tip highlighting marginal rate savings.

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit Task 5**

```bash
git add src/components/Tax/
git commit -m "feat(tax): implement responsive Tax UI components with live calculation"
```

---

### Task 6: Main Tax Page & Navigation Integration

**Files:**
- Create: `src/app/tax/page.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/components/MobileBottomNav.tsx`

**Interfaces:**
- Adds `/tax` route to main web application with full state synchronization.
- Adds "ภาษี" link with Lucide `Receipt` or `Calculator` icon to navigation menus.

- [ ] **Step 1: Implement `src/app/tax/page.tsx`**

Connects:
- Year selector (current year ± 2 years).
- Fetching initial data via `/api/tax?year=YYYY`.
- Real-time recalculation on any input change via `calculateTax()`.
- "บันทึกลง Google Sheet" button with loading spinner and toast notification.
- "ซิงค์รายได้ใหม่" button to reload transactions from sheet.

- [ ] **Step 2: Update `src/components/Navbar.tsx` and `src/components/MobileBottomNav.tsx`**

Add navigation entry:
- Desktop Navbar: Add `{ name: 'ภาษี', href: '/tax', icon: Calculator }`
- MobileBottomNav: Add `{ name: 'ภาษี', href: '/tax', icon: Calculator }`

- [ ] **Step 3: Run linter and full Next.js production build**

Run: `npm run lint` and `npm run build`
Expected: Both exit with code 0 without any errors.

- [ ] **Step 4: Commit Task 6**

```bash
git add src/app/tax/page.tsx src/components/Navbar.tsx src/components/MobileBottomNav.tsx
git commit -m "feat(tax): add /tax page and integrate into desktop and mobile navigation"
```

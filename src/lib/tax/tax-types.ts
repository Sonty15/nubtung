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

export type ExemptionReason =
  | 'LOAN_CASHBACK'
  | 'FAMILY_SUPPORT'
  | 'COST_SHARING'
  | 'REFUND_TRANSFER';

export interface TaxBreakdownTransaction {
  id: string;
  date: string;
  time?: string;
  type: string;
  amount: number;
  category: string;
  account?: string;
  note?: string;
  section: keyof IncomeBySection;
  isExempt: boolean;
  exemptionReason?: ExemptionReason;
  isUserExcluded?: boolean;
}

export interface CategorizeTransactionsResult {
  syncedIncome: IncomeBySection;
  transactionsBySection: Record<keyof IncomeBySection, TaxBreakdownTransaction[]>;
  exemptTransactions: TaxBreakdownTransaction[];
  totalTaxableIncome: number;
  totalExemptIncome: number;
}

export interface SavedTaxProfile {
  year: number;
  income: IncomeBySection;
  deductions: TaxDeductions;
  withholdingTax: number;
  excludedTransactionIds?: string[];
}


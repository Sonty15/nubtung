import type {
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
  { tierName: '750,001 - 1,000,000', minIncome: 750000, maxIncome: 1000000, rate: 0.2 },
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
      (netTaxableIncome === 0
        ? bracket.minIncome === 0
        : netTaxableIncome > bracket.minIncome) &&
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

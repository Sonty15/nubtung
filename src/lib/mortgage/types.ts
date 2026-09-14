export interface InterestTier {
  startMonth: number;
  endMonth: number;
  rateType: 'FIXED' | 'MRR_OFFSET';
  rateValue: number; // e.g. 2.20 or -2.895
  label: string;
}

export interface InterestConfig {
  mrr: number; // e.g. 6.145
  tiers: InterestTier[];
}

export const DEFAULT_INTEREST_CONFIG: InterestConfig = {
  mrr: 6.145,
  tiers: [
    { startMonth: 1, endMonth: 12, rateType: 'FIXED', rateValue: 2.20, label: 'ปีที่ 1 (2.20% คงที่)' },
    { startMonth: 13, endMonth: 24, rateType: 'FIXED', rateValue: 3.25, label: 'ปีที่ 2 (3.25% คงที่)' },
    { startMonth: 25, endMonth: 36, rateType: 'MRR_OFFSET', rateValue: -2.895, label: 'ปีที่ 3 (MRR - 2.895%)' },
    { startMonth: 37, endMonth: 480, rateType: 'MRR_OFFSET', rateValue: -0.50, label: 'ปีที่ 4 เป็นต้นไป (MRR - 0.50%)' },
  ],
};

export interface MortgageAccount {
  id: string;
  accountNumber: string;
  name: string;
  loanAmount: number;
  contractDate: string;
  termMonths: number;
  interestConfig: InterestConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface MortgagePayment {
  id?: number;
  accountId: string;
  paymentDate: string; // YYYY-MM-DD
  installmentNo?: number;
  totalPaid: number;
  principal: number;
  interest: number;
  fee: number;
  remainingBalance: number;
  receiptUid?: string;
  source: 'EMAIL_SYNC' | 'MANUAL';
  createdAt?: string;
}

export interface MortgageSummary {
  totalLoanAmount: number;
  totalRemainingBalance: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  totalFeePaid: number;
  progressPercent: number;
  accounts: Array<MortgageAccount & {
    remainingBalance: number;
    principalPaid: number;
    interestPaid: number;
    feePaid: number;
    progressPercent: number;
    paymentCount: number;
  }>;
}

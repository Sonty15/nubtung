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

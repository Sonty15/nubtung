// @ts-expect-error - node test runner requires .ts extension for ESM strip-types
import { query } from './index.ts';
import type { MortgageAccount, MortgagePayment, InterestConfig } from '../mortgage/types.ts';

export const DEFAULT_INTEREST_CONFIG: InterestConfig = {
  mrr: 6.145,
  tiers: [
    { startMonth: 1, endMonth: 12, rateType: 'FIXED', rateValue: 2.20, label: 'ปีที่ 1 (2.20% คงที่)' },
    { startMonth: 13, endMonth: 24, rateType: 'FIXED', rateValue: 3.25, label: 'ปีที่ 2 (3.25% คงที่)' },
    { startMonth: 25, endMonth: 36, rateType: 'MRR_OFFSET', rateValue: -2.895, label: 'ปีที่ 3 (MRR - 2.895%)' },
    { startMonth: 37, endMonth: 480, rateType: 'MRR_OFFSET', rateValue: -0.50, label: 'ปีที่ 4 เป็นต้นไป (MRR - 0.50%)' },
  ],
};

export const INITIAL_MORTGAGE_ACCOUNTS: Omit<MortgageAccount, 'createdAt' | 'updatedAt'>[] = [
  {
    id: '011690010474',
    accountNumber: '011690010474',
    name: 'สินเชื่อเพื่อที่อยู่อาศัย (บ้านหลัก)',
    loanAmount: 2100000.00,
    contractDate: '2026-05-22',
    termMonths: 480,
    interestConfig: DEFAULT_INTEREST_CONFIG,
  },
  {
    id: '011690010482',
    accountNumber: '011690010482',
    name: 'สินเชื่อเบี้ยประกันชีวิตคุ้มครองวงเงิน (MRTA)',
    loanAmount: 100023.00,
    contractDate: '2026-05-22',
    termMonths: 204,
    interestConfig: {
      ...DEFAULT_INTEREST_CONFIG,
      tiers: [
        { startMonth: 1, endMonth: 12, rateType: 'FIXED', rateValue: 2.20, label: 'ปีที่ 1 (2.20% คงที่)' },
        { startMonth: 13, endMonth: 24, rateType: 'FIXED', rateValue: 3.25, label: 'ปีที่ 2 (3.25% คงที่)' },
        { startMonth: 25, endMonth: 36, rateType: 'MRR_OFFSET', rateValue: -2.895, label: 'ปีที่ 3 (MRR - 2.895%)' },
        { startMonth: 37, endMonth: 204, rateType: 'MRR_OFFSET', rateValue: -0.50, label: 'ปีที่ 4 เป็นต้นไป (MRR - 0.50%)' },
      ],
    },
  },
];

export function calculateRemainingBalanceFromHistory(
  loanAmount: number,
  payments: Array<{ principal: number }>
): number {
  const totalPrincipal = payments.reduce((sum, p) => sum + (Number(p.principal) || 0), 0);
  return Math.max(0, Math.round((loanAmount - totalPrincipal) * 100) / 100);
}

export async function initMortgageSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS mortgage_accounts (
      id VARCHAR(50) PRIMARY KEY,
      account_number VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      loan_amount NUMERIC(15, 2) NOT NULL,
      contract_date DATE NOT NULL,
      term_months INTEGER NOT NULL,
      interest_config JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mortgage_payments (
      id SERIAL PRIMARY KEY,
      account_id VARCHAR(50) NOT NULL REFERENCES mortgage_accounts(id) ON DELETE CASCADE,
      payment_date DATE NOT NULL,
      installment_no INTEGER,
      total_paid NUMERIC(15, 2) NOT NULL,
      principal NUMERIC(15, 2) NOT NULL,
      interest NUMERIC(15, 2) NOT NULL,
      fee NUMERIC(15, 2) DEFAULT 0,
      remaining_balance NUMERIC(15, 2) NOT NULL,
      receipt_uid VARCHAR(100),
      source VARCHAR(50) DEFAULT 'EMAIL_SYNC',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_mortgage_account_payment UNIQUE (account_id, payment_date, total_paid)
    );

    CREATE INDEX IF NOT EXISTS idx_mortgage_payments_account ON mortgage_payments(account_id);
    CREATE INDEX IF NOT EXISTS idx_mortgage_payments_date ON mortgage_payments(payment_date DESC);
  `);

  // Pre-seed accounts if not exists
  for (const acc of INITIAL_MORTGAGE_ACCOUNTS) {
    await query(
      `INSERT INTO mortgage_accounts (id, account_number, name, loan_amount, contract_date, term_months, interest_config)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         loan_amount = EXCLUDED.loan_amount,
         term_months = EXCLUDED.term_months,
         interest_config = EXCLUDED.interest_config,
         updated_at = CURRENT_TIMESTAMP`,
      [acc.id, acc.accountNumber, acc.name, acc.loanAmount, acc.contractDate, acc.termMonths, JSON.stringify(acc.interestConfig)]
    );
  }
}

export async function getMortgageAccounts(): Promise<MortgageAccount[]> {
  await initMortgageSchema();
  const res = await query<any>(
    'SELECT id, account_number as "accountNumber", name, loan_amount::float as "loanAmount", contract_date::text as "contractDate", term_months as "termMonths", interest_config as "interestConfig", created_at as "createdAt" FROM mortgage_accounts ORDER BY id ASC'
  );
  return res.rows;
}

export async function getMortgagePayments(accountId?: string): Promise<MortgagePayment[]> {
  await initMortgageSchema();
  const sql = accountId
    ? 'SELECT id, account_id as "accountId", payment_date::text as "paymentDate", installment_no as "installmentNo", total_paid::float as "totalPaid", principal::float as "principal", interest::float as "interest", fee::float as "fee", remaining_balance::float as "remainingBalance", receipt_uid as "receiptUid", source, created_at as "createdAt" FROM mortgage_payments WHERE account_id = $1 ORDER BY payment_date ASC, id ASC'
    : 'SELECT id, account_id as "accountId", payment_date::text as "paymentDate", installment_no as "installmentNo", total_paid::float as "totalPaid", principal::float as "principal", interest::float as "interest", fee::float as "fee", remaining_balance::float as "remainingBalance", receipt_uid as "receiptUid", source, created_at as "createdAt" FROM mortgage_payments ORDER BY payment_date ASC, id ASC';
  
  const res = await query<any>(sql, accountId ? [accountId] : []);
  return res.rows;
}

export async function saveMortgagePayment(payment: MortgagePayment): Promise<void> {
  await initMortgageSchema();
  await query(
    `INSERT INTO mortgage_payments (account_id, payment_date, installment_no, total_paid, principal, interest, fee, remaining_balance, receipt_uid, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (account_id, payment_date, total_paid) DO UPDATE SET
       installment_no = EXCLUDED.installment_no,
       principal = EXCLUDED.principal,
       interest = EXCLUDED.interest,
       fee = EXCLUDED.fee,
       remaining_balance = EXCLUDED.remaining_balance,
       receipt_uid = EXCLUDED.receipt_uid,
       source = EXCLUDED.source`,
    [
      payment.accountId,
      payment.paymentDate,
      payment.installmentNo ?? null,
      payment.totalPaid,
      payment.principal,
      payment.interest,
      payment.fee || 0,
      payment.remainingBalance,
      payment.receiptUid ?? null,
      payment.source || 'MANUAL',
    ]
  );
}

export async function deleteMortgagePayment(id: number): Promise<boolean> {
  const res = await query('DELETE FROM mortgage_payments WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

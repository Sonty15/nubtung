# Mortgage Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive mortgage tracking system in Nubtang for GH Bank loans (House loan 2.1M and MRTA loan 100k), featuring automated email receipt sync, balance calculation, Recharts analytics, and an interactive extra payment amortization simulator.

**Architecture:** Hybrid Database + Email Sync approach using PostgreSQL for persistence and instant dashboard rendering, enhanced IMAP PDF parsing in `src/lib/ghb/sync.ts`, Next.js API routes for sync and CRUD, and a modern responsive dashboard in `/mortgage`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide React, Recharts, PostgreSQL (`pg`), ImapFlow, Poppler-utils (`pdftotext`), `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-15-mortgage-tracker-design.md`

## Global Constraints
- Loan Account 1: `011690010474` (House, 2,100,000.00 THB, 480 months / 40 years)
- Loan Account 2: `011690010482` (MRTA, 100,023.00 THB, 204 months / 17 years)
- Contract Date: 2026-05-22
- Stepped Interest: Year 1: 2.20%, Year 2: 3.25%, Year 3: MRR - 2.895%, Year 4+: MRR - 0.50% (Benchmark MRR: 6.145%)
- Framework: Next.js App Router, TypeScript, Tailwind CSS v4

---

### Task 1: Database Schema & Repository Layer for Mortgage

**Files:**
- Create: `src/lib/mortgage/types.ts`
- Modify: `src/lib/db/index.ts:35-65`
- Create: `src/lib/db/mortgage.ts`
- Test: `src/lib/db/mortgage.test.ts`

**Interfaces:**
- Produces:
  - `MortgageAccount`: `{ id: string; accountNumber: string; name: string; loanAmount: number; contractDate: string; termMonths: number; interestConfig: any; createdAt?: string }`
  - `MortgagePayment`: `{ id?: number; accountId: string; paymentDate: string; installmentNo?: number; totalPaid: number; principal: number; interest: number; fee: number; remainingBalance: number; receiptUid?: string; source: 'EMAIL_SYNC' | 'MANUAL'; createdAt?: string }`
  - `initMortgageSchema(): Promise<void>`
  - `getMortgageAccounts(): Promise<MortgageAccount[]>`
  - `getMortgagePayments(accountId?: string): Promise<MortgagePayment[]>`
  - `saveMortgagePayment(payment: MortgagePayment): Promise<void>`
  - `deleteMortgagePayment(id: number): Promise<boolean>`

- [ ] **Step 1: Create Mortgage Types**

Create `src/lib/mortgage/types.ts`:
```typescript
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
```

- [ ] **Step 2: Write failing unit test for mortgage DB repository helper**

Create `src/lib/db/mortgage.test.ts`:
```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRemainingBalanceFromHistory } from './mortgage.ts';

describe('Mortgage DB Balance Calculation Helper', () => {
  it('computes remaining balance sequentially starting from loan amount', () => {
    const loanAmount = 2100000;
    const payments = [
      { principal: 5000, fee: 0, interest: 3850 },
      { principal: 5200, fee: 0, interest: 3800 },
    ];
    const b1 = calculateRemainingBalanceFromHistory(loanAmount, payments.slice(0, 1));
    assert.strictEqual(b1, 2095000);
    const b2 = calculateRemainingBalanceFromHistory(loanAmount, payments);
    assert.strictEqual(b2, 2089800);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test src/lib/db/mortgage.test.ts`
Expected: FAIL with module/function not found.

- [ ] **Step 4: Implement DB tables, seed, and repository in `src/lib/db/mortgage.ts` and `src/lib/db/index.ts`**

Create `src/lib/db/mortgage.ts`:
```typescript
import { query } from './index';
import { MortgageAccount, MortgagePayment, InterestConfig } from '../mortgage/types';

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
```

In `src/lib/db/index.ts`, call `initMortgageSchema()` inside `initSchema()`.

- [ ] **Step 5: Run tests and verify PASS**

Run: `node --test src/lib/db/mortgage.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -f src/lib/mortgage/types.ts src/lib/db/mortgage.ts src/lib/db/mortgage.test.ts src/lib/db/index.ts
git commit -m "feat(mortgage): add database schema, types, and repository layer"
```

---

### Task 2: Mortgage Amortization & Extra Payment Simulation Engine

**Files:**
- Create: `src/lib/mortgage/simulator.ts`
- Create: `src/lib/mortgage/simulator.test.ts`

**Interfaces:**
- Produces:
  - `getInterestRateForMonth(monthIndex: number, config: InterestConfig): number`
  - `simulateMortgageSchedule(params: SimulationParams): SimulationResult`
  - `compareExtraPayment(params: CompareParams): ExtraPaymentComparison`

- [ ] **Step 1: Write failing unit tests for simulator engine**

Create `src/lib/mortgage/simulator.test.ts`:
```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error - node test runner import
import { getInterestRateForMonth, simulateMortgageSchedule, compareExtraPayment } from './simulator.ts';
// @ts-expect-error - node test runner import
import { DEFAULT_INTEREST_CONFIG } from '../db/mortgage.ts';

describe('Mortgage Simulator Engine', () => {
  it('returns correct interest rate for contract year tiers', () => {
    // Month 1-12: 2.20%
    assert.strictEqual(getInterestRateForMonth(1, DEFAULT_INTEREST_CONFIG), 2.20);
    assert.strictEqual(getInterestRateForMonth(12, DEFAULT_INTEREST_CONFIG), 2.20);
    // Month 13-24: 3.25%
    assert.strictEqual(getInterestRateForMonth(13, DEFAULT_INTEREST_CONFIG), 3.25);
    // Month 25-36: MRR - 2.895 = 6.145 - 2.895 = 3.25%
    assert.strictEqual(getInterestRateForMonth(25, DEFAULT_INTEREST_CONFIG), 3.25);
    // Month 37+: MRR - 0.50 = 6.145 - 0.50 = 5.645%
    assert.strictEqual(getInterestRateForMonth(37, DEFAULT_INTEREST_CONFIG), 5.645);
  });

  it('calculates extra payment savings accurately', () => {
    const comparison = compareExtraPayment({
      principal: 2100000,
      startMonthIndex: 1,
      baseMonthlyPayment: 8500,
      extraMonthlyPayment: 3000,
      interestConfig: DEFAULT_INTEREST_CONFIG,
    });

    assert.ok(comparison.monthsSaved > 0, 'Should reduce payment months');
    assert.ok(comparison.interestSaved > 100000, 'Should save substantial interest');
    assert.strictEqual(comparison.withExtra.totalMonths < comparison.standard.totalMonths, true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/mortgage/simulator.test.ts`
Expected: FAIL with simulator module not found.

- [ ] **Step 3: Implement simulator logic in `src/lib/mortgage/simulator.ts`**

Create `src/lib/mortgage/simulator.ts`:
```typescript
import { InterestConfig } from './types';

export interface SimulationParams {
  principal: number;
  startMonthIndex?: number;
  monthlyPayment: number;
  extraMonthlyPayment?: number;
  interestConfig: InterestConfig;
  maxMonths?: number;
}

export interface MonthSchedulePoint {
  month: number;
  interestRate: number;
  payment: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
}

export interface SimulationResult {
  totalMonths: number;
  totalPaid: number;
  totalInterest: number;
  totalPrincipal: number;
  schedule: MonthSchedulePoint[];
}

export interface ExtraPaymentComparison {
  standard: SimulationResult;
  withExtra: SimulationResult;
  monthsSaved: number;
  yearsSaved: number;
  interestSaved: number;
}

export function getInterestRateForMonth(monthIndex: number, config: InterestConfig): number {
  const tier = config.tiers.find((t) => monthIndex >= t.startMonth && monthIndex <= t.endMonth);
  if (!tier) {
    // Default to last tier
    const lastTier = config.tiers[config.tiers.length - 1];
    return lastTier.rateType === 'MRR_OFFSET' ? config.mrr + lastTier.rateValue : lastTier.rateValue;
  }
  const rate = tier.rateType === 'MRR_OFFSET' ? config.mrr + tier.rateValue : tier.rateValue;
  return Math.round(rate * 10000) / 10000;
}

export function simulateMortgageSchedule(params: SimulationParams): SimulationResult {
  let balance = params.principal;
  const startMonth = params.startMonthIndex || 1;
  const extra = params.extraMonthlyPayment || 0;
  const maxMonths = params.maxMonths || 600; // 50 yrs limit
  const schedule: MonthSchedulePoint[] = [];

  let totalInterest = 0;
  let totalPrincipal = 0;
  let month = startMonth;

  while (balance > 0.01 && month <= maxMonths) {
    const rate = getInterestRateForMonth(month, params.interestConfig);
    // Approximate monthly interest: Balance * (annual rate / 100) / 12
    const monthlyInterest = Math.round((balance * (rate / 100) / 12) * 100) / 100;
    
    // Total installment for this month
    const totalPayment = Math.max(params.monthlyPayment + extra, monthlyInterest + 1);
    const principalToCut = Math.min(balance, totalPayment - monthlyInterest);

    balance = Math.max(0, Math.round((balance - principalToCut) * 100) / 100);
    totalInterest += monthlyInterest;
    totalPrincipal += principalToCut;

    schedule.push({
      month,
      interestRate: rate,
      payment: principalToCut + monthlyInterest,
      principalPaid: principalToCut,
      interestPaid: monthlyInterest,
      remainingBalance: balance,
    });

    month++;
  }

  return {
    totalMonths: schedule.length,
    totalPaid: Math.round((totalPrincipal + totalInterest) * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPrincipal: Math.round(totalPrincipal * 100) / 100,
    schedule,
  };
}

export function compareExtraPayment(params: {
  principal: number;
  startMonthIndex?: number;
  baseMonthlyPayment: number;
  extraMonthlyPayment: number;
  interestConfig: InterestConfig;
}): ExtraPaymentComparison {
  const standard = simulateMortgageSchedule({
    principal: params.principal,
    startMonthIndex: params.startMonthIndex,
    monthlyPayment: params.baseMonthlyPayment,
    extraMonthlyPayment: 0,
    interestConfig: params.interestConfig,
  });

  const withExtra = simulateMortgageSchedule({
    principal: params.principal,
    startMonthIndex: params.startMonthIndex,
    monthlyPayment: params.baseMonthlyPayment,
    extraMonthlyPayment: params.extraMonthlyPayment,
    interestConfig: params.interestConfig,
  });

  const monthsSaved = Math.max(0, standard.totalMonths - withExtra.totalMonths);
  const yearsSaved = Math.round((monthsSaved / 12) * 10) / 10;
  const interestSaved = Math.max(0, Math.round((standard.totalInterest - withExtra.totalInterest) * 100) / 100);

  return {
    standard,
    withExtra,
    monthsSaved,
    yearsSaved,
    interestSaved,
  };
}
```

- [ ] **Step 4: Run tests and verify PASS**

Run: `node --test src/lib/mortgage/simulator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -f src/lib/mortgage/simulator.ts src/lib/mortgage/simulator.test.ts
git commit -m "feat(mortgage): add mortgage amortization and extra payment simulation engine"
```

---

### Task 3: Enhance GH Bank Receipt Parser & IMAP Sync Engine

**Files:**
- Modify: `src/lib/ghb/sync.ts:80-140`
- Create: `src/lib/ghb/sync.test.ts`

**Interfaces:**
- Consumes:
  - `saveMortgagePayment` from `src/lib/db/mortgage.ts`
- Produces:
  - `parseGhbReceiptText(text: string): ParsedReceipt | null`
  - `syncMortgageReceiptsFromEmail(): Promise<{ added: number; errors: string[] }>`

- [ ] **Step 1: Write unit test for enhanced parser**

Create `src/lib/ghb/sync.test.ts`:
```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error - node test runner import
import { parseGhbReceiptText } from './sync.ts';

describe('GHB Receipt Parser', () => {
  it('parses receipt with insurance fee, interest, and principal', () => {
    const sampleText = `
      ธนาคารอาคารสงเคราะห์
      ใบเสร็จรับเงินอิเล็กทรอนิกส์
      เลขที่บัญชี 011690010482
      วันที่ 27 กรกฎาคม 2569
      จำนวนเงินที่ชำระ *****600.00 บาท
      ค่าประกันอัคคีภัย   ดอกเบี้ย   เงินต้น
      180.74   0.00   419.26
      เงินต้นคงเหลือ 99,603.74 บาท
    `;
    const result = parseGhbReceiptText(sampleText);
    assert.ok(result);
    assert.strictEqual(result.accountNo, '011690010482');
    assert.strictEqual(result.totalPaid, 600.00);
    assert.strictEqual(result.fee, 180.74);
    assert.strictEqual(result.principal, 419.26);
    assert.strictEqual(result.remainingBalance, 99603.74);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/ghb/sync.test.ts`
Expected: FAIL with `remainingBalance` undefined.

- [ ] **Step 3: Update `src/lib/ghb/sync.ts`**

Enhance `parseGhbReceiptText` in `src/lib/ghb/sync.ts`:
- Add `remainingBalance?: number` to return type.
- Extract `remainingBalance` via regex `/(?:เงินต้นคงเหลือ|ยอดคงเหลือ)\s+\*?([\d,]+\.\d{2})/`.
- Implement `syncMortgageReceiptsFromEmail()`:
  - Searches IMAP for emails from GH Bank.
  - Downloads PDFs, decrypts with `pdftotext`.
  - For each valid receipt matching either `011690010474` or `011690010482`:
    - Save to `mortgage_payments` using `saveMortgagePayment`.
  - Recalculates remaining balances if missing.

- [ ] **Step 4: Run tests and verify PASS**

Run: `node --test src/lib/ghb/sync.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -f src/lib/ghb/sync.ts src/lib/ghb/sync.test.ts
git commit -m "feat(mortgage): enhance GHB receipt parser with balance detection and email sync"
```

---

### Task 4: Next.js API Routes for Mortgage

**Files:**
- Create: `src/app/api/mortgage/route.ts`
- Create: `src/app/api/mortgage/sync/route.ts`
- Create: `src/app/api/mortgage/payments/route.ts`
- Create: `src/app/api/mortgage/payments/[id]/route.ts`

**Interfaces:**
- `GET /api/mortgage`: Returns `{ success: true, summary: MortgageSummary, payments: MortgagePayment[] }`
- `POST /api/mortgage/sync`: Triggers email sync, returns `{ success: true, addedCount: number }`
- `POST /api/mortgage/payments`: Adds manual payment record
- `DELETE /api/mortgage/payments/[id]`: Deletes payment record

- [ ] **Step 1: Implement `GET /api/mortgage/route.ts`**

Calculates overall summary:
- Fetch accounts via `getMortgageAccounts()`.
- Fetch payments via `getMortgagePayments()`.
- Calculate remaining balance for each account and total.
- Return structured summary and payments list.

- [ ] **Step 2: Implement `POST /api/mortgage/sync/route.ts`**

Calls `syncMortgageReceiptsFromEmail()`, returns imported count and status.

- [ ] **Step 3: Implement manual payment routes**

`src/app/api/mortgage/payments/route.ts`:
- Validates input body (accountId, paymentDate, totalPaid, principal, interest, fee, remainingBalance).
- Calls `saveMortgagePayment()`.

`src/app/api/mortgage/payments/[id]/route.ts`:
- Calls `deleteMortgagePayment(Number(params.id))`.

- [ ] **Step 4: Commit**

```bash
git add -f src/app/api/mortgage/route.ts src/app/api/mortgage/sync/route.ts src/app/api/mortgage/payments/route.ts src/app/api/mortgage/payments/[id]/route.ts
git commit -m "feat(mortgage): add REST API endpoints for mortgage dashboard and sync"
```

---

### Task 5: Mortgage Dashboard UI Components

**Files:**
- Create: `src/components/Mortgage/MortgageOverviewCards.tsx`
- Create: `src/components/Mortgage/MortgageCharts.tsx`
- Create: `src/components/Mortgage/MortgageSimulator.tsx`
- Create: `src/components/Mortgage/MortgageHistoryTable.tsx`
- Create: `src/components/Mortgage/ManualPaymentModal.tsx`
- Create: `src/components/Mortgage/MortgageDashboard.tsx`

**Features:**
- Responsive Tailwind v4 design with Dark/Light mode support
- Tab navigation between:
  1. `ภาพรวมทั้งหมด (2.2M)`
  2. `สินเชื่อบ้านหลัก (2.1M)`
  3. `สินเชื่อ MRTA (100k)`
- Recharts visualizations:
  - Stacked Bar Chart: Breakdown of each month's payment (Principal in emerald, Interest in amber, Fee in blue)
  - Area Chart: Balance reduction curve over time
- Real-time Interactive Simulator:
  - User adjusts slider or types extra amount (e.g. 3,000 THB)
  - Instantly computes months/years saved and interest saved
- Sync button with loading spinner and status feedback banner

- [ ] **Step 1: Implement `MortgageOverviewCards.tsx`**
- [ ] **Step 2: Implement `MortgageCharts.tsx` with Recharts**
- [ ] **Step 3: Implement `MortgageSimulator.tsx`**
- [ ] **Step 4: Implement `MortgageHistoryTable.tsx` & `ManualPaymentModal.tsx`**
- [ ] **Step 5: Assemble container `MortgageDashboard.tsx`**
- [ ] **Step 6: Commit**

```bash
git add -f src/components/Mortgage/
git commit -m "feat(mortgage): create responsive UI components and interactive simulator"
```

---

### Task 6: Page Route, Navigation Links & Integration

**Files:**
- Create: `src/app/mortgage/page.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/components/MobileBottomNav.tsx`

- [ ] **Step 1: Create `src/app/mortgage/page.tsx`**
Export default page rendering `Navbar`, `MortgageDashboard`, and `MobileBottomNav`.

- [ ] **Step 2: Add "ผ่อนบ้าน" link to `src/components/Navbar.tsx`**
Add `{ label: 'ผ่อนบ้าน (Mortgage)', href: '/mortgage', icon: Home }` to `navItems`.

- [ ] **Step 3: Add "ผ่อนบ้าน" link to `src/components/MobileBottomNav.tsx`**
Add mortgage navigation link with `Home` icon.

- [ ] **Step 4: Verify build and TypeScript compilation**

Run: `npm run build`
Expected: Successful Next.js production build with 0 TypeScript or lint errors.

- [ ] **Step 5: Commit**

```bash
git add -f src/app/mortgage/page.tsx src/components/Navbar.tsx src/components/MobileBottomNav.tsx
git commit -m "feat(mortgage): add /mortgage route and update navigation bars"
```

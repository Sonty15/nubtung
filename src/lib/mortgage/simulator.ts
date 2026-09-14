import type { InterestConfig } from './types.ts';

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

export interface CompareParams {
  principal: number;
  startMonthIndex?: number;
  baseMonthlyPayment: number;
  extraMonthlyPayment: number;
  interestConfig: InterestConfig;
}

export function getInterestRateForMonth(monthIndex: number, config: InterestConfig): number {
  const tier = config.tiers.find((t) => monthIndex >= t.startMonth && monthIndex <= t.endMonth);
  const selectedTier = tier || config.tiers[config.tiers.length - 1];
  const rate = selectedTier.rateType === 'MRR_OFFSET'
    ? config.mrr + selectedTier.rateValue
    : selectedTier.rateValue;
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

export function compareExtraPayment(params: CompareParams): ExtraPaymentComparison {
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

import {
  addMonths,
  differenceInCalendarDays,
  isValid,
  parseISO,
  isLeapYear,
} from "date-fns";

export interface AnnuityScheduleParams {
  principal: number;
  annualInterestRatePercent: number;
  termMonths: number;
  issueDate: Date | string;
  firstPaymentDate?: Date | string;
  interestOnlyFirstPeriod?: boolean;
  dayCountBasis?: "ACTUAL_365" | "ACTUAL_360" | "ACTUAL_ACTUAL";
  /** Number of fractional digits to round monetary amounts to. Defaults to 2. */
  roundingDecimals?: number;
}

export interface PaymentScheduleEntry {
  paymentDate: Date;
  paymentAmount: number;
  interestAmount: number;
  principalAmount: number;
  remainingPrincipal: number;
}

function normalizeDate(input: Date | string): Date {
  const d = typeof input === "string" ? parseISO(input) : input;
  if (!isValid(d)) throw new Error("Invalid date provided");
  return d;
}

function roundToDecimals(value: number, decimals: number): number {
  if (!Number.isFinite(decimals)) return value;
  const clamped = Math.max(0, Math.min(10, Math.floor(decimals)));
  const factor = Math.pow(10, clamped);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function dayCountFraction(
  from: Date,
  to: Date,
  basis: "ACTUAL_365" | "ACTUAL_360" | "ACTUAL_ACTUAL"
): number {
  if (differenceInCalendarDays(to, from) <= 0) return 0;

  if (basis === "ACTUAL_ACTUAL") {
    // Actual/Actual: split by calendar years and sum dayCount / daysInYear
    let cursor = from;
    let fractionSum = 0;
    while (differenceInCalendarDays(to, cursor) > 0) {
      const currentYear = cursor.getFullYear();
      const yearEnd = new Date(currentYear + 1, 0, 1);
      const periodEnd = yearEnd < to ? yearEnd : to;
      const daysInSlice = differenceInCalendarDays(periodEnd, cursor);
      const daysInYear = isLeapYear(cursor) ? 366 : 365;
      fractionSum += daysInSlice / daysInYear;
      cursor = periodEnd;
    }
    return fractionSum;
  }

  const days = differenceInCalendarDays(to, from);
  const basisDays = basis === "ACTUAL_360" ? 360 : 365;
  return days / basisDays;
}

export function generateAnnuitySchedule(
  params: AnnuityScheduleParams
): PaymentScheduleEntry[] {
  const {
    principal,
    annualInterestRatePercent,
    termMonths,
    issueDate: rawIssueDate,
    firstPaymentDate: rawFirstPaymentDate,
    interestOnlyFirstPeriod = false,
    dayCountBasis = "ACTUAL_365",
    roundingDecimals = 2,
  } = params;



  if (principal <= 0) throw new Error("principal must be > 0");
  if (termMonths <= 0) throw new Error("termMonths must be > 0");
  if (annualInterestRatePercent < 0)
    throw new Error("annualInterestRatePercent must be >= 0");

  const issueDate = normalizeDate(rawIssueDate);
  let firstPaymentDate: Date;
  if(!rawFirstPaymentDate) {
    firstPaymentDate = addMonths(issueDate, 1);
  } else {
    firstPaymentDate = normalizeDate(rawFirstPaymentDate);
  }

  if (differenceInCalendarDays(firstPaymentDate, issueDate) < 0) {
    throw new Error("firstPaymentDate must be on/after issueDate");
  }

  const schedule: PaymentScheduleEntry[] = [];
  const monthlyRate = annualInterestRatePercent / 12 / 100;

  let remainingPrincipal = principal;
  let currentPaymentDate = firstPaymentDate;

  // Optional interest-only first period (from issueDate to firstPaymentDate)
  let amortizationMonths = termMonths;
  if (interestOnlyFirstPeriod) {
    const fraction = dayCountFraction(
      issueDate,
      firstPaymentDate,
      dayCountBasis
    );
    const interestOnlyAmount = roundToDecimals(
      principal * (annualInterestRatePercent / 100) * fraction
    , roundingDecimals);
    schedule.push({
      paymentDate: currentPaymentDate,
      paymentAmount: interestOnlyAmount,
      interestAmount: interestOnlyAmount,
      principalAmount: 0,
      remainingPrincipal: roundToDecimals(remainingPrincipal, roundingDecimals),
    });
    amortizationMonths -= 1;
    currentPaymentDate = addMonths(currentPaymentDate, 1);
  }

  if (amortizationMonths <= 0) {
    return schedule;
  }

  // Compute level annuity payment for remaining months
  let annuityPayment: number;
  if (monthlyRate === 0) {
    annuityPayment = roundToDecimals(
      remainingPrincipal / amortizationMonths,
      roundingDecimals
    );
  } else {
    const ratePlus1PowN = Math.pow(1 + monthlyRate, amortizationMonths);
    annuityPayment = roundToDecimals(
      (remainingPrincipal * monthlyRate * ratePlus1PowN) / (ratePlus1PowN - 1)
    , roundingDecimals);
  }

  for (let i = 1; i <= amortizationMonths; i += 1) {
    const interestAmount = roundToDecimals(
      remainingPrincipal * monthlyRate,
      roundingDecimals
    );
    let principalAmount = roundToDecimals(
      annuityPayment - interestAmount,
      roundingDecimals
    );

    // Adjust the last installment for rounding residue
    const isLast = i === amortizationMonths;
    if (isLast) {
      principalAmount = roundToDecimals(remainingPrincipal, roundingDecimals);
    }

    const paymentAmount = roundToDecimals(
      interestAmount + principalAmount,
      roundingDecimals
    );
    remainingPrincipal = roundToDecimals(
      remainingPrincipal - principalAmount,
      roundingDecimals
    );

    schedule.push({
      paymentDate: currentPaymentDate,
      paymentAmount,
      interestAmount,
      principalAmount,
      remainingPrincipal: Math.max(0, remainingPrincipal),
    });

    if (!isLast) {
      currentPaymentDate = addMonths(currentPaymentDate, 1);
    }
  }

  return schedule;
}

import {
  addMonths,
  differenceInCalendarDays,
  getDaysInMonth,
  isLeapYear,
} from "date-fns";

export interface LoanScheduleParams {
  principal: number;
  annualInterestRatePercent: number;
  loanType: "ANNUITY" | "AMORTIZATION";
  termMonths: number;
  issueDate: Date;
  firstPaymentDate?: Date;
  interestOnlyFirstPeriod?: boolean;
  dayCountBasis?: "ACTUAL_365" | "ACTUAL_360" | "ACTUAL_ACTUAL";
  /** Number of fractional digits to round monetary amounts to. Defaults to 2. */
  roundingDecimals?: number;
  earlyRepayments?: {
    earlyRepaymentDateStart?: Date | string;
    earlyRepaymentDateEnd?: Date | string;
    periodicity?: "MONTHLY" | "QUARTERLY" | "YEARLY";
    earlyRepaymentAmount?: number;
    repaymentType?: "DECREASE_TERM" | "DECREASE_PAYMENT";
  }[];
}

export interface LoanScheduleEntry {
  paymentDate: Date;
  paymentAmount: number;
  interestAmount: number;
  principalAmount: number;
  remainingPrincipal: number;
  earlyRepaymentAmount?: number;
}

export function generateLoanSchedule(
  params: LoanScheduleParams
): LoanScheduleEntry[] {
  const schedule: LoanScheduleEntry[] = [];

  const {
    principal,
    annualInterestRatePercent,
    termMonths,
    issueDate,
    loanType = "ANNUITY",
    firstPaymentDate,
    interestOnlyFirstPeriod = false,
    dayCountBasis = "ACTUAL_365",
    roundingDecimals = 2,
    earlyRepayments = [],
  } = params;

  if (principal <= 0) throw new Error("principal must be > 0");
  if (termMonths <= 0) throw new Error("termMonths must be > 0");
  if (annualInterestRatePercent < 0)
    throw new Error("annualInterestRatePercent must be >= 0");
  if (firstPaymentDate && firstPaymentDate < issueDate)
    throw new Error("firstPaymentDate must be >= issueDate");

  let currentDate = firstPaymentDate ? firstPaymentDate : addMonths(issueDate, 1);
  let remainingPrincipal = principal;
  let remainingTermMonths = termMonths;

  if (interestOnlyFirstPeriod) {
    const differenceInDays = differenceInCalendarDays(
      currentDate,
      issueDate
    );
    const basis = getYearBasis(firstPaymentDate, dayCountBasis);
    const interestAmount = roundDecimals(
      (remainingPrincipal *
        (annualInterestRatePercent / 100) *
        differenceInDays) /
        basis,
      roundingDecimals
    );
    schedule.push({
      paymentDate: currentDate,
      paymentAmount: interestAmount,
      interestAmount: interestAmount,
      principalAmount: 0,
      remainingPrincipal: remainingPrincipal,
    });
    remainingTermMonths = remainingTermMonths - 1;
    currentDate = addMonths(currentDate, 1);
  }

  if (loanType === "ANNUITY") {
    return scheduleAnnuityPayments({
      schedule,
      remainingPrincipal,
      remainingTermMonths,
      currentDate,
      annualInterestRatePercent,
      dayCountBasis,
      roundingDecimals,
      termMonths,
    });
  } else {
    return scheduleAmortizationPayments({
      schedule,
      remainingPrincipal,
      remainingTermMonths,
      currentDate,
      annualInterestRatePercent,
      dayCountBasis,
      roundingDecimals,
      termMonths,
    });
  }
}

export function scheduleAnnuityPayments(dto: {
  schedule: LoanScheduleEntry[];
  remainingPrincipal: number;
  remainingTermMonths: number;
  currentDate: Date;
  annualInterestRatePercent: number;
  dayCountBasis: "ACTUAL_365" | "ACTUAL_360" | "ACTUAL_ACTUAL";
  roundingDecimals: number;
  termMonths: number;
}): LoanScheduleEntry[] {
  const {
    annualInterestRatePercent,
    dayCountBasis,
    roundingDecimals,
    termMonths,
  } = dto;

  let { schedule, remainingPrincipal, remainingTermMonths, currentDate } = dto;

  const monthlyInterestRate = annualInterestRatePercent / 12 / 100;
  const monthlyPayment = calculateAnnuityMonthlyPayment(
    remainingPrincipal,
    monthlyInterestRate,
    remainingTermMonths,
    roundingDecimals
  );

  while (remainingTermMonths > 0) {
    if(remainingTermMonths === 1 && remainingPrincipal > 0) {
      const daysInYear = getYearBasis(currentDate, dayCountBasis);
      const daysInMonth = getDaysInMonth(currentDate);
      const interestAmount = roundDecimals(
        remainingPrincipal *
          (annualInterestRatePercent / 100 / daysInYear) *
          daysInMonth,
        roundingDecimals
      );
      schedule.push({
        paymentDate: currentDate,
        paymentAmount: roundDecimals(
          remainingPrincipal + interestAmount,
          roundingDecimals
        ),
        interestAmount: interestAmount,
        principalAmount: remainingPrincipal,
        remainingPrincipal: 0,
      });
      break;
    }
    const daysInYear = getYearBasis(currentDate, dayCountBasis);
    const daysInMonth = getDaysInMonth(currentDate);
    const interestAmount = roundDecimals(
      remainingPrincipal *
        (annualInterestRatePercent / 100 / daysInYear) *
        daysInMonth,
      roundingDecimals
    );
    const principalAmount = roundDecimals(
      monthlyPayment - interestAmount,
      roundingDecimals
    );
    remainingPrincipal = roundDecimals(
      remainingPrincipal - principalAmount,
      roundingDecimals
    );
    schedule.push({
      paymentDate: currentDate,
      paymentAmount: monthlyPayment,
      interestAmount: interestAmount,
      principalAmount: principalAmount,
      remainingPrincipal: remainingPrincipal,
    });
    currentDate = addMonths(currentDate, 1);
    remainingTermMonths = remainingTermMonths - 1;
  }

  return schedule;
}

export function scheduleAmortizationPayments(dto: {
  schedule: LoanScheduleEntry[];
  remainingPrincipal: number;
  remainingTermMonths: number;
  currentDate: Date;
  annualInterestRatePercent: number;
  dayCountBasis: "ACTUAL_365" | "ACTUAL_360" | "ACTUAL_ACTUAL";
  roundingDecimals: number;
  termMonths: number;
}): LoanScheduleEntry[] {
  const {
    annualInterestRatePercent,
    dayCountBasis,
    roundingDecimals,
    termMonths,
  } = dto;

  let { schedule, remainingPrincipal, currentDate, remainingTermMonths } = dto;

  const monthlyPrincipal = remainingPrincipal / termMonths;

  while (remainingTermMonths > 0) {
    if(remainingTermMonths === 1 && remainingPrincipal > 0) {
      const daysInYear = getYearBasis(currentDate, dayCountBasis);
      const daysInMonth = getDaysInMonth(currentDate);
      const interestAmount = roundDecimals(
        remainingPrincipal *
          (annualInterestRatePercent / 100 / daysInYear) *
          daysInMonth,
        roundingDecimals
      );
      schedule.push({
        paymentDate: currentDate,
        paymentAmount: roundDecimals(
          remainingPrincipal + interestAmount,
          roundingDecimals
        ),
        interestAmount: interestAmount,
        principalAmount: remainingPrincipal,
        remainingPrincipal: 0,
      });
      break;
    }
    const daysInYear = getYearBasis(currentDate, dayCountBasis);
    const daysInMonth = getDaysInMonth(currentDate);
    const interestAmount = roundDecimals(
      remainingPrincipal *
        (annualInterestRatePercent / 100 / daysInYear) *
        daysInMonth,
      roundingDecimals
    );
    remainingPrincipal = roundDecimals(
      remainingPrincipal - monthlyPrincipal,
      roundingDecimals
    );
    schedule.push({
      paymentDate: currentDate,
      paymentAmount: roundDecimals(
        monthlyPrincipal + interestAmount,
        roundingDecimals
      ),
      interestAmount: interestAmount,
      principalAmount: monthlyPrincipal,
      remainingPrincipal,
    });
    currentDate = addMonths(currentDate, 1);
    remainingTermMonths = remainingTermMonths - 1;
  }

  return schedule;
}

export function calculateAnnuityMonthlyPayment(
  principal: number,
  monthlyInterestRate: number,
  termMonths: number,
  roundingDecimals: number
): number {
  return roundDecimals(
    (principal *
      monthlyInterestRate *
      Math.pow(1 + monthlyInterestRate, termMonths)) /
      (Math.pow(1 + monthlyInterestRate, termMonths) - 1),
    roundingDecimals
  );
}

export function getYearBasis(
  paymentDate: Date,
  dayCountBasis: "ACTUAL_365" | "ACTUAL_360" | "ACTUAL_ACTUAL"
): number {
  let daysInYear = 365;
  if (dayCountBasis === "ACTUAL_360") {
    daysInYear = 360;
  }
  if (dayCountBasis === "ACTUAL_ACTUAL") {
    daysInYear = isLeapYear(paymentDate) ? 366 : 365;
  }
  return daysInYear;
}

export function roundDecimals(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

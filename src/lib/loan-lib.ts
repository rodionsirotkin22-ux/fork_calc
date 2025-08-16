import {
  addMonths,
  differenceInCalendarDays,
  getDaysInMonth,
  isLeapYear,
  isWeekend,
  nextMonday,
} from "date-fns";

export interface LoanScheduleParams {
  principal: number;
  annualInterestRatePercent: number;
  loanType: "ANNUITY" | "AMORTIZATION";
  termMonths: number;
  issueDate: Date;
  paymentDayNumber?: number;
  interestOnlyFirstPeriod?: boolean;
  moveHolidayToNextDay?: boolean;
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
    interestOnlyFirstPeriod = false,
    dayCountBasis = "ACTUAL_365",
    roundingDecimals = 2,
    earlyRepayments = [],
    moveHolidayToNextDay = false,
  } = params;

  if (principal <= 0) throw new Error("principal must be > 0");
  if (termMonths <= 0) throw new Error("termMonths must be > 0");
  if (annualInterestRatePercent < 0)
    throw new Error("annualInterestRatePercent must be >= 0");

  const paymentDayNumber = params.paymentDayNumber ?? issueDate.getDate();
  let previousDate = issueDate;
  let currentDate = moveToNextDate(
    issueDate,
    paymentDayNumber,
    moveHolidayToNextDay
  );
  let remainingPrincipal = principal;
  let remainingTermMonths = termMonths;
  const monthlyInterestRate = annualInterestRatePercent / 12 / 100;
  const termMonthsToCalculate = interestOnlyFirstPeriod
    ? termMonths - 1
    : termMonths;
  const monthlyPayment = calculateAnnuityMonthlyPayment({
    principal,
    monthlyInterestRate,
    termMonths: termMonthsToCalculate,
    roundingDecimals,
  });

  const amortizationPrincipal = remainingPrincipal / termMonthsToCalculate;

  while (remainingTermMonths > 0) {
    const dayDifference = differenceInCalendarDays(currentDate, previousDate);
    const { daysInYear } = getMonthDaysAndYearDays(currentDate, dayCountBasis);
    const interestAmount = roundDecimals(
      remainingPrincipal *
        (annualInterestRatePercent / 100 / daysInYear) *
        dayDifference,
      roundingDecimals
    );

    if (remainingTermMonths === termMonths && interestOnlyFirstPeriod) {
      schedule.push({
        paymentDate: currentDate,
        paymentAmount: interestAmount,
        interestAmount: interestAmount,
        principalAmount: 0,
        remainingPrincipal: remainingPrincipal,
      });
      previousDate = currentDate;
      currentDate = moveToNextDate(
        currentDate,
        paymentDayNumber,
        moveHolidayToNextDay
      );
      remainingTermMonths = remainingTermMonths - 1;
      continue;
    }

    if (remainingTermMonths === 1 && remainingPrincipal > 0) {
      schedule.push({
        paymentDate: currentDate,
        paymentAmount: roundDecimals(
          remainingPrincipal + interestAmount,
          roundingDecimals
        ),
        interestAmount,
        principalAmount: remainingPrincipal,
        remainingPrincipal: 0,
      });
      break;
    }

    if (loanType === "ANNUITY") {
      const principalAmount = roundDecimals(
        monthlyPayment - interestAmount,
        roundingDecimals
      );
      remainingPrincipal = roundDecimals(
        remainingPrincipal - principalAmount,
        roundingDecimals
      );
      schedule.push({
        paymentDate: new Date(currentDate),
        paymentAmount: monthlyPayment,
        interestAmount: interestAmount,
        principalAmount: principalAmount,
        remainingPrincipal: remainingPrincipal,
      });
    } else {
      remainingPrincipal = roundDecimals(
        remainingPrincipal - amortizationPrincipal,
        roundingDecimals
      );
      schedule.push({
        paymentDate: currentDate,
        paymentAmount: roundDecimals(
          amortizationPrincipal + interestAmount,
          roundingDecimals
        ),
        interestAmount: interestAmount,
        principalAmount: amortizationPrincipal,
        remainingPrincipal,
      });
    }

    previousDate = currentDate;
    currentDate = moveToNextDate(
      currentDate,
      paymentDayNumber,
      moveHolidayToNextDay
    );
    remainingTermMonths = remainingTermMonths - 1;
  }

  return schedule;
}

export function moveToNextDate(
  currentDate: Date,
  paymentDayNumber: number,
  moveHolidayToNextDay: boolean
): Date {
  let nextDate = new Date(currentDate);
  const paymentDay = currentDate.getDate();
  if (paymentDay !== paymentDayNumber) {
    nextDate.setDate(paymentDayNumber);
  }
  nextDate = addMonths(nextDate, 1);
  if (moveHolidayToNextDay) {
    if (isWeekend(nextDate)) {
      nextDate = nextMonday(nextDate);
    }
  }
  return nextDate;
}

export function calculateAnnuityMonthlyPayment(dto: {
  principal: number;
  monthlyInterestRate: number;
  termMonths: number;
  roundingDecimals: number;
}): number {
  const { principal, monthlyInterestRate, termMonths, roundingDecimals } = dto;
  return roundDecimals(
    (principal *
      monthlyInterestRate *
      Math.pow(1 + monthlyInterestRate, termMonths)) /
      (Math.pow(1 + monthlyInterestRate, termMonths) - 1),
    roundingDecimals
  );
}

export function getMonthDaysAndYearDays(
  paymentDate: Date,
  dayCountBasis: "ACTUAL_365" | "ACTUAL_360" | "ACTUAL_ACTUAL"
): { daysInYear: number; daysInMonth: number } {
  let daysInYear = 360;
  let daysInMonth = 30;
  if (dayCountBasis === "ACTUAL_365") {
    daysInYear = 365;
    daysInMonth = getDaysInMonth(paymentDate);
    if (daysInMonth === 29) {
      daysInMonth = 28;
    }
  }
  if (dayCountBasis === "ACTUAL_ACTUAL") {
    daysInYear = isLeapYear(paymentDate) ? 366 : 365;
    daysInMonth = getDaysInMonth(paymentDate);
  }
  return { daysInYear, daysInMonth };
}

export function roundDecimals(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

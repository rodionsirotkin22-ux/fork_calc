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
  firstPaymentDate?: Date;
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
    firstPaymentDate,
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
  if (firstPaymentDate && firstPaymentDate < issueDate)
    throw new Error("firstPaymentDate must be >= issueDate");

  let currentDate = firstPaymentDate
    ? firstPaymentDate
    : moveToNextDate(issueDate, firstPaymentDate, moveHolidayToNextDay);
  let remainingPrincipal = principal;
  let remainingTermMonths = termMonths;

  if (interestOnlyFirstPeriod) {
    const differenceInDays = differenceInCalendarDays(currentDate, issueDate);
    const { daysInYear } = getMonthDaysAndYearDays(firstPaymentDate, dayCountBasis);
    const interestAmount = roundDecimals(
      (remainingPrincipal *
        (annualInterestRatePercent / 100) *
        differenceInDays) /
        daysInYear,
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
    currentDate = moveToNextDate(currentDate, firstPaymentDate, moveHolidayToNextDay);
  }

  return schedulePayments({
    schedule,
    remainingPrincipal,
    remainingTermMonths,
    currentDate,
    firstPaymentDate,
    annualInterestRatePercent,
    dayCountBasis,
    roundingDecimals,
    moveHolidayToNextDay,
    loanType,
  });
}

// TODO: Считать число дней по разнице между периодами при переносе выходных на следующий день
export function schedulePayments(dto: {
  schedule: LoanScheduleEntry[];
  loanType: "ANNUITY" | "AMORTIZATION";
  remainingPrincipal: number;
  remainingTermMonths: number;
  currentDate: Date;
  firstPaymentDate: Date;
  annualInterestRatePercent: number;
  dayCountBasis: "ACTUAL_365" | "ACTUAL_360" | "ACTUAL_ACTUAL";
  roundingDecimals: number;
  moveHolidayToNextDay: boolean;
}): LoanScheduleEntry[] {
  const {
    annualInterestRatePercent,
    dayCountBasis,
    roundingDecimals,
    moveHolidayToNextDay,
    firstPaymentDate,
    loanType,
  } = dto;

  let { schedule, remainingPrincipal, remainingTermMonths, currentDate } = dto;
  

  const monthlyInterestRate = annualInterestRatePercent / 12 / 100;
  const monthlyPayment = calculateAnnuityMonthlyPayment(
    remainingPrincipal,
    monthlyInterestRate,
    remainingTermMonths,
    roundingDecimals
  );

  const amortizationPrincipal = remainingPrincipal / remainingTermMonths;

  while (remainingTermMonths > 0) {
    const { daysInMonth, daysInYear } = getMonthDaysAndYearDays(
      currentDate,
      dayCountBasis
    );
    const interestAmount = roundDecimals(
      remainingPrincipal *
        (annualInterestRatePercent / 100 / daysInYear) *
        daysInMonth,
      roundingDecimals
    );

    if (remainingTermMonths === 1 && remainingPrincipal > 0) {
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

    if(loanType === "ANNUITY") {
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
    currentDate = moveToNextDate(currentDate, firstPaymentDate, moveHolidayToNextDay);
    remainingTermMonths = remainingTermMonths - 1;
    
  }
  return schedule;
}

export function moveToNextDate(date: Date, firstPaymentDate: Date, moveHolidayToNextDay: boolean): Date {
  let nextDate = date;
  const paymentDay = date.getDate();
  const firstPaymentDay = firstPaymentDate.getDate();
  if(paymentDay !== firstPaymentDay) {
      nextDate.setDate(firstPaymentDay);
  }
  nextDate = addMonths(date, 1);
  if(moveHolidayToNextDay) {
    if(isWeekend(nextDate)) {
      nextDate = nextMonday(nextDate)
    }
  }
  return nextDate;
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

export function getMonthDaysAndYearDays(
  paymentDate: Date,
  dayCountBasis: "ACTUAL_365" | "ACTUAL_360" | "ACTUAL_ACTUAL"
): { daysInYear: number; daysInMonth: number } {
  let daysInYear = 360;
  let daysInMonth = 30;
  if (dayCountBasis === "ACTUAL_365") {
    daysInYear = 365;
    daysInMonth = getDaysInMonth(paymentDate);
    if(daysInMonth === 29) {
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

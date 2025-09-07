export interface LoanInputForm {
    loanAmount: number;
    loanTerm: number;
    loanType: "ANNUITY" | "AMORTIZATION";
    loanTermType: "y" | "m";
    interestRate: number;
    interestOnlyFirstPeriod?: boolean;
    dayCountBasis?: "ACTUAL_365" | "ACTUAL_360" | "ACTUAL_ACTUAL";
    roundingDecimals?: number;
    issueDate: Date;
    paymentDayNumber?: number;
    moveHolidayToNextDay?: boolean;
    earlyRepayments?: {
        earlyRepaymentDateStart: Date;
        earlyRepaymentDateEnd?: Date;
        periodicity?: "ONCE" | "MONTHLY" | "QUARTERLY" | "YEARLY";
        earlyRepaymentAmount?: number;
        repaymentType?: "DECREASE_TERM" | "DECREASE_PAYMENT";
    }[];
}
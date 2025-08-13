export interface LoanInputForm {
    loanAmount: number;
    loanTerm: number;
    loanTermType: "y" | "m";
    interestRate: number;
    interestOnlyFirstPeriod?:boolean;
    dayCountBasis?: "ACTUAL_365" | "ACTUAL_360" | "ACTUAL_ACTUAL";
    roundingDecimals?:number;
    issueDate: Date;
    firstPaymentDate?: Date;
}
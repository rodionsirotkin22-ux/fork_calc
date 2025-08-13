"use client";

import { DataTable } from "@/components/ui/data-table";
import { generateAnnuitySchedule, PaymentScheduleEntry } from "@/lib/loan-lib";
import { useState } from "react";
import { LoanInputForm } from "../types/loan-input-form.type";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import dynamic from "next/dynamic";

const LoanInputCard = dynamic(() => import('./loan-input-card'), { ssr: false })

export const columns: ColumnDef<PaymentScheduleEntry>[] = [
  {
    header: "Дата",
    accessorKey: "paymentDate",
    cell: ({ row }) => {
      return <div>{format(row.original.paymentDate, "dd.MM.yyyy")}</div>;
    },
  },
  {
    header: "Платеж",
    accessorKey: "paymentAmount",
  },
  {
    header: "Основной долг",
    accessorKey: "principalAmount",
  },
  {
    header: "Проценты",
    accessorKey: "interestAmount",
  },
  {
    header: "Остаток",
    accessorKey: "remainingPrincipal",
  },
];

export default function Page() {
  const [data, setData] = useState<PaymentScheduleEntry[]>([]);

  function onFormSubmit(data: LoanInputForm) {
    const schedule = generateAnnuitySchedule({
      termMonths: data.loanTerm * (data.loanTermType === "y" ? 12 : 1),
      principal: data.loanAmount,
      annualInterestRatePercent: data.interestRate,
      issueDate: data.issueDate,
      firstPaymentDate: data.firstPaymentDate,
      interestOnlyFirstPeriod: data.interestOnlyFirstPeriod,
      dayCountBasis: data.dayCountBasis,
    });
    setData(schedule);
  }
  return (
    <div className="w-full h-full flex items-start justify-start mt-10 gap-4">
      <div className="ml-10">
        <LoanInputCard onFormSubmit={onFormSubmit} />
      </div>

      <div className="min-h-0 h-[calc(100dvh-2.5rem)] pr-4 pb-4 flex flex-col gap-4 w-full items-stretch">
        <h2 className="text-2xl font-bold text-center">График платежей</h2>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
}

"use client";

import { DataTable } from "@/components/ui/data-table";
import { LoanScheduleEntry, generateLoanSchedule } from "@/lib/loan-lib";
import { useState } from "react";
import { LoanInputForm } from "../types/loan-input-form.type";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, CartesianGrid } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const LoanInputCard = dynamic(() => import("./loan-input-card"), {
  ssr: false,
});

interface LoanScheduleRow {
  month: number;
  paymentDate: string;
  paymentAmount: string;
  principalAmount: string;
  interestAmount: string;
  remainingPrincipal: string;
}

export const columns: ColumnDef<LoanScheduleRow>[] = [
  {
    header: "№",
    accessorKey: "month",
  },
  {
    header: "Дата",
    accessorKey: "paymentDate",
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

const chartConfig = {
  paymentAmount: {
    label: "Общий платёж",
    color: "#10b981",
  },
  interestAmount: {
    label: "Проценты",
    color: "#60a5fa",
  },
} satisfies ChartConfig;

export default function Page() {
  const [data, setData] = useState<LoanScheduleEntry[]>([]);
  const [roundingDecimals, setRoundingDecimals] = useState(2);

  function onFormSubmit(form: LoanInputForm) {
    const schedule = generateLoanSchedule({
      termMonths: form.loanTerm * (form.loanTermType === "y" ? 12 : 1),
      loanType: form.loanType,
      principal: form.loanAmount,
      annualInterestRatePercent: form.interestRate,
      issueDate: form.issueDate,
      firstPaymentDate: form.firstPaymentDate,
      interestOnlyFirstPeriod: form.interestOnlyFirstPeriod,
      dayCountBasis: form.dayCountBasis,
    });
    setData(schedule);
    setRoundingDecimals(form.roundingDecimals);
  }
  return (
    <div className="w-full h-full flex items-start justify-start mt-10 gap-4">
      <div className="ml-10">
        <LoanInputCard onFormSubmit={onFormSubmit} />
      </div>

      <div className="flex flex-col gap-4 w-full items-stretch">
        <Card className={data.length > 0 ? "h-116" : "h-auto"}>
          <CardHeader>
            <CardTitle className="text-center">Таблица платежей</CardTitle>
          </CardHeader>
          <CardContent className={data.length > 0 ? "h-100 overflow-auto" : ""}>
            <DataTable
              columns={columns}
              data={data.map((item, index) => ({
                month: index + 1,
                paymentDate: format(item.paymentDate, "dd.MM.yyyy"),
                paymentAmount: item.paymentAmount.toFixed(roundingDecimals),
                principalAmount: item.principalAmount.toFixed(roundingDecimals),
                interestAmount: item.interestAmount.toFixed(roundingDecimals),
                remainingPrincipal:
                  item.remainingPrincipal.toFixed(roundingDecimals),
              }))}
            />
          </CardContent>
        </Card>

        {data.length > 0 && (
          <Card className="pt-0">
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
              <div className="grid flex-1 gap-1">
                <CardTitle className="text-center">График платежей</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[250px] w-full"
              >
                <AreaChart
                  data={data.map((value, index) => ({
                    paymentDate: value.paymentDate,
                    paymentAmount: Number(
                      value.paymentAmount.toFixed(roundingDecimals)
                    ),
                    interestAmount: Number(
                      value.interestAmount.toFixed(roundingDecimals)
                    ),
                  }))}
                >
                  <defs>
                    <linearGradient
                      id="fillPaymentAmount"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#10b981"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient
                      id="fillInterestAmount"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#60a5fa"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="paymentDate"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => {
                          return new Date(value).toLocaleDateString(undefined, {
                            month: "long",
                            year: "numeric",
                            day: "numeric",
                          });
                        }}
                        indicator="dot"
                      />
                    }
                    cursor={false}
                    defaultIndex={1}
                  />
                  <Area
                    dataKey="paymentAmount"
                    type="natural"
                    fill="url(#fillPaymentAmount)"
                    stroke="#10b981"
                  />
                  <Area
                    dataKey="interestAmount"
                    type="natural"
                    fill="url(#fillInterestAmount)"
                    stroke="#60a5fa"
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

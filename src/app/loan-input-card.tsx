"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LoanInputForm } from "@/types/loan-input-form.type";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { DatePickerNew } from "@/components/ui/date-picker-new";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronsUpDown } from "lucide-react";
import { useEffect } from "react";
import { FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";

export default function LoanInputCard({
  onFormSubmit,
}: {
  onFormSubmit?: (data: LoanInputForm) => void;
}) {
  const LOCAL_STORAGE_KEY = "loan-input-form-settings";
  const schema = z
    .object({
      loanAmount: z.coerce.number().gt(0, "Сумма должна быть больше 0"),
      loanTerm: z.coerce
        .number()
        .int("Срок должен быть целым числом")
        .gt(0, "Срок должен быть больше 0"),
      loanTermType: z.enum(["y", "m"]),
      interestRate: z.coerce
        .number()
        .min(0, "Ставка не может быть отрицательной"),
      loanType: z.enum(["ANNUITY", "AMORTIZATION"]),
      interestOnlyFirstPeriod: z.boolean().optional(),
      moveHolidayToNextDay: z.boolean().optional(),
      dayCountBasis: z
        .enum(["ACTUAL_365", "ACTUAL_360", "ACTUAL_ACTUAL"])
        .optional(),
      roundingDecimals: z.union([
        z.coerce
          .number()
          .int("Должно быть целым числом")
          .min(0, "Минимум 0")
          .max(10, "Максимум 10"),
        z.undefined(),
      ]),
      issueDate: z.coerce.date(),
      firstPaymentDate: z.union([z.coerce.date(), z.undefined()]),
    })
    .superRefine((val, ctx) => {
      if (!(val.issueDate instanceof Date) || isNaN(val.issueDate.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["issueDate"],
          message: "Неверная дата",
        });
      }
      if (
        val.firstPaymentDate &&
        (!(val.firstPaymentDate instanceof Date) ||
          isNaN(val.firstPaymentDate.getTime()))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["firstPaymentDate"],
          message: "Неверная дата",
        });
      }
      if (
        val.firstPaymentDate &&
        val.firstPaymentDate.getTime() < val.issueDate.getTime()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["firstPaymentDate"],
          message: "Дата первого платежа должна быть не раньше даты выдачи",
        });
      }
    });

  const defaultValues: LoanInputForm = {
    loanAmount: 100000,
    loanTerm: 12,
    loanTermType: "m",
    loanType: "ANNUITY",
    interestRate: 10,
    interestOnlyFirstPeriod: false,
    dayCountBasis: "ACTUAL_365",
    roundingDecimals: 2,
    issueDate: new Date(),
    moveHolidayToNextDay: false,
  };

  // Get initial values from localStorage or use defaults
  const getInitialValues = (): LoanInputForm => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) {
        return defaultValues;
      }

      const parsed = JSON.parse(raw);
      return {
        loanAmount: Number(parsed.loanAmount) || 100000,
        loanTerm: Number(parsed.loanTerm) || 12,
        loanTermType: parsed.loanTermType === "y" ? "y" : "m",
        loanType:
          parsed.loanType === "AMORTIZATION" ? "AMORTIZATION" : "ANNUITY",
        interestRate: Number(parsed.interestRate) || 10,
        dayCountBasis: ["ACTUAL_365", "ACTUAL_360", "ACTUAL_ACTUAL"].includes(
          parsed.dayCountBasis
        )
          ? parsed.dayCountBasis
          : "ACTUAL_365",
        roundingDecimals:
          parsed.roundingDecimals === "" || parsed.roundingDecimals == null
            ? 2
            : Number(parsed.roundingDecimals),
        issueDate: parsed.issueDate ? new Date(parsed.issueDate) : new Date(),
        firstPaymentDate: parsed.firstPaymentDate
          ? new Date(parsed.firstPaymentDate)
          : undefined,
        interestOnlyFirstPeriod: Boolean(parsed.interestOnlyFirstPeriod),
        moveHolidayToNextDay: Boolean(parsed.moveHolidayToNextDay),
      };
    } catch (error) {
      console.warn("Failed to load saved loan settings, using defaults", error);
      return defaultValues;
    }
  };

  const form = useForm<LoanInputForm>({
    resolver: zodResolver(schema) as unknown as Resolver<LoanInputForm>,
    defaultValues: getInitialValues(),
  });

  // Persist settings to localStorage on any change
  useEffect(() => {
    const subscription = form.watch((value) => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value));
      } catch (error) {
        console.warn("Failed to save loan settings", error);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  function onSubmit(data: LoanInputForm) {
    onFormSubmit?.(data);
  }

  return (
    <div className="flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">Кредитный калькулятор</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="loanAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Размер кредита</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100000" {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormLabel className="text-sm font-medium">
                    Срок кредита
                  </FormLabel>
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="loanTerm"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input type="number" placeholder="12" {...field} />
                          </FormControl>
                          <FormDescription hidden={true}>
                            Введите срок кредита (число)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="loanTermType"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <FormControl>
                                <SelectValue />
                              </FormControl>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="y">лет</SelectItem>
                              <SelectItem value="m">месяцев</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription hidden={true}>
                            Выберите единицу измерения срока (месяцев или лет)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="interestRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Процентная ставка</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10" {...field} />
                      </FormControl>
                      <FormDescription hidden={true}>
                        Введите процентную ставку в процентах
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="loanType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип платежа</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <FormControl>
                            <SelectValue />
                          </FormControl>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ANNUITY">Аннуитетный</SelectItem>
                          <SelectItem value="AMORTIZATION">
                            Дифференцированный
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription hidden={true}>
                        Выберите тип платежа кредита
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата выдачи кредита</FormLabel>
                      <FormControl>
                        <DatePickerNew
                          key={field.value ? field.value.toISOString() : "none"}
                          onDateChange={field.onChange}
                          defaultDate={field.value}
                        />
                      </FormControl>
                      <FormDescription hidden={true}>
                        Введите дату выдачи кредита
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="firstPaymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата первого платежа</FormLabel>
                      <FormControl>
                        <DatePickerNew
                          key={field.value ? field.value.toISOString() : "none"}
                          onDateChange={field.onChange}
                          defaultDate={field.value}
                          placeholder={form
                            .getValues()
                            .issueDate.toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                        />
                      </FormControl>
                      <FormDescription hidden={true}>
                        Введите дату первого платежа
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Collapsible className="flex flex-col gap-2">
                  <div className="flex justify-between items-center gap-2">
                    <h4 className="text-sm font-semibold">
                      Дополнительные параметры
                    </h4>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <ChevronsUpDown />
                        <span className="sr-only">Toggle</span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="flex flex-1 flex-col gap-2">
                      <FormField
                        control={form.control}
                        name="roundingDecimals"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Количество знаков после запятой
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="2"
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(
                                    value === "" ? undefined : Number(value)
                                  );
                                }}
                              />
                            </FormControl>
                            <FormDescription hidden={true}>
                              Введите количество знаков после запятой для
                              округления суммы платежа
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dayCountBasis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>База расчета дней</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <SelectTrigger>
                                <FormControl>
                                  <SelectValue />
                                </FormControl>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ACTUAL_365">
                                  365 дней в году
                                </SelectItem>
                                <SelectItem value="ACTUAL_360">
                                  360 дней в году
                                </SelectItem>
                                <SelectItem value="ACTUAL_ACTUAL">
                                  Фактические дни
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription hidden={true}>
                              Выберите базу расчета дней
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="interestOnlyFirstPeriod"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Первый месяц проценты</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="moveHolidayToNextDay"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>
                              Перенос выходных на следующий день
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Button type="submit">Рассчитать</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

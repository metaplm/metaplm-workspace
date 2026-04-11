import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

  const [thisMonthRows, thisYearRows, totalRows, categoryRows, countRows, monthRows] = await Promise.all([
    // This month by currency
    prisma.expense.groupBy({
      by: ["currency"],
      where: { date: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    // This year by currency
    prisma.expense.groupBy({
      by: ["currency"],
      where: { date: { gte: yearStart, lt: yearEnd } },
      _sum: { amount: true },
    }),
    // All time by currency
    prisma.expense.groupBy({
      by: ["currency"],
      _sum: { amount: true },
    }),
    // Category amounts (all time)
    prisma.expense.groupBy({
      by: ["category"],
      _sum: { amount: true },
    }),
    // Category counts (all time)
    prisma.expense.groupBy({
      by: ["category"],
      _count: { id: true },
    }),
    // Available months
    prisma.$queryRaw<{ month: string }[]>`
      SELECT DISTINCT TO_CHAR(date AT TIME ZONE 'UTC', 'YYYY-MM') as month
      FROM "Expense"
      ORDER BY month DESC
    `,
  ]);

  const toMap = (rows: { currency: string; _sum: { amount: number | null } }[]) =>
    Object.fromEntries(rows.map((r) => [r.currency, r._sum.amount ?? 0]));

  return NextResponse.json({
    thisMonth: toMap(thisMonthRows),
    thisYear: toMap(thisYearRows),
    total: toMap(totalRows),
    categoryAmounts: Object.fromEntries(
      categoryRows.map((r) => [r.category, r._sum.amount ?? 0])
    ),
    categoryCounts: Object.fromEntries(
      countRows.map((r) => [r.category, r._count.id ?? 0])
    ),
    availableMonths: monthRows.map((r) => r.month),
  });
}

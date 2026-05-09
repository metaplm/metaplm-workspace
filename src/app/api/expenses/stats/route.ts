import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // "YYYY-MM" or null — filters category counts

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

  let catDateGte: Date | null = null;
  let catDateLt: Date | null = null;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    catDateGte = new Date(y, m - 1, 1);
    catDateLt = new Date(y, m, 1);
  }

  // Use raw SQL for category groupBy to avoid enum mismatch when new categories are added
  const categoryAmountQuery = catDateGte
    ? Prisma.sql`SELECT category::text, SUM(amount) as total FROM "Expense" WHERE date >= ${catDateGte} AND date < ${catDateLt} GROUP BY category`
    : Prisma.sql`SELECT category::text, SUM(amount) as total FROM "Expense" GROUP BY category`;

  const categoryCntQuery = catDateGte
    ? Prisma.sql`SELECT category::text, COUNT(id) as cnt FROM "Expense" WHERE date >= ${catDateGte} AND date < ${catDateLt} GROUP BY category`
    : Prisma.sql`SELECT category::text, COUNT(id) as cnt FROM "Expense" GROUP BY category`;

  const catWhere = catDateGte
    ? { date: { gte: catDateGte, lt: catDateLt! } }
    : {};

  const [thisMonthRows, thisYearRows, totalRows, categoryRows, countRows, monthRows] = await Promise.all([
    prisma.expense.groupBy({
      by: ["currency"],
      where: { date: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["currency"],
      where: { date: { gte: yearStart, lt: yearEnd } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["currency"],
      _sum: { amount: true },
    }),
    prisma.$queryRaw<{ category: string; total: string }[]>(categoryAmountQuery),
    prisma.$queryRaw<{ category: string; cnt: string }[]>(categoryCntQuery),
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
      categoryRows.map((r) => [r.category, parseFloat(r.total) ?? 0])
    ),
    categoryCounts: Object.fromEntries(
      countRows.map((r) => [r.category, parseInt(r.cnt) ?? 0])
    ),
    availableMonths: monthRows.map((r) => r.month),
  });
}

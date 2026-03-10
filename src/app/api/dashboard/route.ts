import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    deals,
    activities,
    recentTimeEntries,
    invoices,
    expenses,
  ] = await Promise.all([
    prisma.deal.findMany({ where: { stage: { notIn: ["WON", "LOST"] } } }),
    prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { company: true, contact: true } }),
    prisma.timeEntry.findMany({
      where: { date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
    }),
    prisma.invoice.findMany({
      where: { dueDate: { lte: thirtyDaysLater } },
      include: { deal: { include: { company: true } } },
    }),
    prisma.expense.findMany({
      where: { date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
    }),
  ]);

  const totalPipeline = deals.reduce((s, d) => s + d.amount, 0);
  const monthlyHours = recentTimeEntries.reduce((s, e) => s + e.hours, 0);
  const billableHours = recentTimeEntries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);
  const monthlyExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const overdueInvoices = invoices.filter(
    (i) => i.dueDate && i.dueDate < now && i.status !== "PAID"
  );
  const upcomingInvoices = invoices.filter(
    (i) => i.dueDate && i.dueDate >= now && i.status !== "PAID"
  );

  const expectedIncome = upcomingInvoices.reduce((s, i) => s + i.amount, 0);

  return NextResponse.json({
    totalPipeline,
    dealCount: deals.length,
    monthlyHours,
    billableHours,
    billableRate: monthlyHours > 0 ? (billableHours / monthlyHours) * 100 : 0,
    monthlyExpenses,
    overdueInvoices: overdueInvoices.length,
    expectedIncome,
    recentActivities: activities,
  });
}

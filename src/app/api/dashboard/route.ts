import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    allDeals,
    activities,
    timeEntries,
    allInvoices,
    expenses,
    activityStats,
  ] = await Promise.all([
    prisma.deal.findMany({ include: { company: true } }),
    prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { company: true, contact: true } }),
    prisma.timeEntry.findMany({
      where: { date: { gte: monthStart } },
      include: { company: true, project: true },
    }),
    prisma.invoice.findMany({
      include: { deal: { include: { company: true } } },
    }),
    prisma.expense.findMany({
      where: { date: { gte: monthStart } },
    }),
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      include: { deal: true },
    }),
  ]);

  // Active deals (not WON/LOST)
  const activeDeals = allDeals.filter(d => !["WON", "LOST"].includes(d.stage));
  const totalPipeline = activeDeals.reduce((s, d) => s + d.amount, 0);

  // Deal stage funnel
  const dealFunnel = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION"].map(stage => {
    const stageDeals = activeDeals.filter(d => d.stage === stage);
    return {
      stage,
      count: stageDeals.length,
      amount: stageDeals.reduce((s, d) => s + d.amount, 0),
    };
  });

  // Timesheet stats
  const monthlyHours = timeEntries.reduce((s, e) => s + e.hours, 0);
  const billableHours = timeEntries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);
  
  // Timesheet by project/company (top 5)
  const projectHours = timeEntries.reduce((acc, e) => {
    const key = e.project?.name || e.company?.name || "Unassigned";
    if (!acc[key]) acc[key] = 0;
    acc[key] += e.hours;
    return acc;
  }, {} as Record<string, number>);
  const topProjects = Object.entries(projectHours)
    .map(([name, hours]) => ({ name, hours }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  // Expense breakdown
  const monthlyExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const expenseByCategory = expenses.reduce((acc, e) => {
    const cat = e.category || "GENEL";
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += e.amount;
    return acc;
  }, {} as Record<string, number>);
  const topExpenseCategories = Object.entries(expenseByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  // Invoice summary
  const paidThisMonth = allInvoices.filter(
    i => i.status === "PAID" && i.issuedDate >= monthStart
  );
  const monthlyRevenue = paidThisMonth.reduce((s, i) => s + i.amount, 0);
  
  const pendingInvoices = allInvoices.filter(i => ["PENDING", "DRAFT"].includes(i.status));
  const totalPending = pendingInvoices.reduce((s, i) => s + i.amount, 0);
  
  const overdueInvoices = allInvoices.filter(
    i => i.dueDate && i.dueDate < now && i.status !== "PAID"
  );
  const totalOverdue = overdueInvoices.reduce((s, i) => s + i.amount, 0);

  const upcomingInvoices = allInvoices.filter(
    i => i.dueDate && i.dueDate >= now && i.dueDate <= thirtyDaysLater && i.status !== "PAID"
  );
  const expectedIncome = upcomingInvoices.reduce((s, i) => s + i.amount, 0);

  // P&L
  const netPL = monthlyRevenue - monthlyExpenses;

  // Activity stats
  const totalActivities = activityStats.length;
  const convertedActivities = activityStats.filter(a => a.dealId).length;
  const activityConversionRate = totalActivities ? (convertedActivities / totalActivities) * 100 : 0;
  const upcomingNextActions = activityStats.filter(
    a => a.nextActionDate && new Date(a.nextActionDate) >= now
  ).length;

  return NextResponse.json({
    // Pipeline
    totalPipeline,
    dealCount: activeDeals.length,
    dealFunnel,
    
    // Revenue
    monthlyRevenue,
    totalPending,
    expectedIncome,
    
    // Expenses
    monthlyExpenses,
    topExpenseCategories,
    
    // P&L
    netPL,
    
    // Invoices
    overdueCount: overdueInvoices.length,
    totalOverdue,
    
    // Timesheet
    monthlyHours,
    billableHours,
    billableRate: monthlyHours > 0 ? (billableHours / monthlyHours) * 100 : 0,
    topProjects,
    
    // Activities
    recentActivities: activities,
    activityStats: {
      total: totalActivities,
      converted: convertedActivities,
      conversionRate: activityConversionRate,
      upcomingNextActions,
    },
  });
}

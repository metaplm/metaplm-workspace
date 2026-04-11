import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const skip = parseInt(searchParams.get("skip") ?? "0");
  const take = parseInt(searchParams.get("take") ?? "0");
  const month = searchParams.get("month"); // "YYYY-MM" or null

  // Build optional month filter
  let dateFilter: { gte?: Date; lt?: Date } | undefined;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    dateFilter = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }
  const where = dateFilter ? { date: dateFilter } : undefined;

  // Paginated mode: ?skip=N&take=N — returns { expenses, total }
  if (take > 0) {
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { deal: { include: { company: true } } },
        orderBy: { date: "desc" },
        skip,
        take,
      }),
      prisma.expense.count({ where }),
    ]);
    return NextResponse.json({ expenses, total });
  }

  // Legacy: return all (used by other pages/reports)
  const expenses = await prisma.expense.findMany({
    where,
    include: { deal: { include: { company: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  
  // Convert date string to Date object
  data.date = body.date ? new Date(body.date) : new Date();
  
  // Convert empty description to null
  if (data.description === "") {
    data.description = null;
  }
  
  const expense = await prisma.expense.create({
    data: data as any,
    include: { deal: { include: { company: true } } },
  });
  return NextResponse.json(expense, { status: 201 });
}

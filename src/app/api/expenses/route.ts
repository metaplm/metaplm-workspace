import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const expenses = await prisma.expense.findMany({
    include: { deal: { include: { company: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const expense = await prisma.expense.create({
    data: { ...body, date: body.date ? new Date(body.date) : new Date() },
    include: { deal: true },
  });
  return NextResponse.json(expense, { status: 201 });
}

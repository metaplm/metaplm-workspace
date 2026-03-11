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

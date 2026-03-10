import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseTimeInput } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const dealId = searchParams.get("dealId");

  const where: Record<string, unknown> = {};
  if (dealId) where.dealId = dealId;
  if (year && month) {
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: { deal: { include: { company: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { value, unit, ...rest } = body;
  const hours = unit ? parseTimeInput(String(value), unit) : parseFloat(value || rest.hours);

  const entry = await prisma.timeEntry.create({
    data: { ...rest, hours, date: new Date(rest.date) },
    include: { deal: true },
  });
  return NextResponse.json(entry, { status: 201 });
}

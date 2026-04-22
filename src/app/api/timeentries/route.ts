import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseTimeInput } from "@/lib/utils";
import { TimeEntrySchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const companyId = searchParams.get("companyId");
  const projectId = searchParams.get("projectId");
  const category = searchParams.get("category");
  const customer = searchParams.get("customer");
  const billable = searchParams.get("billable");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const where: Record<string, unknown> = {};
  if (companyId) where.companyId = companyId;
  if (projectId) where.projectId = projectId;
  if (category) where.category = category;
  if (customer) {
    where.company = { name: { contains: customer, mode: "insensitive" } };
  }
  if (billable === "true" || billable === "false") {
    where.billable = billable === "true";
  }

  if (start || end) {
    const range: Record<string, Date> = {};
    if (start) range.gte = new Date(start);
    if (end) range.lte = new Date(end);
    where.date = range;
  } else if (year && month) {
    const from = new Date(parseInt(year), parseInt(month) - 1, 1);
    const to = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    where.date = { gte: from, lte: to };
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: { company: true, project: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = TimeEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { value, unit, date, hours: rawHours, ...rest } = parsed.data;
  const hours = unit ? parseTimeInput(String(value), unit) : parseFloat(String(value ?? rawHours));

  const entry = await prisma.timeEntry.create({
    data: { ...rest, hours, date: new Date(date) },
    include: { company: true, project: true },
  });
  return NextResponse.json(entry, { status: 201 });
}

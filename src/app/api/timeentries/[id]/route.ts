import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseTimeInput } from "@/lib/utils";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { value, unit, date, ...rest } = body;

  const data: Record<string, unknown> = { ...rest };
  if (value !== undefined) {
    data.hours = unit ? parseTimeInput(String(value), unit) : parseFloat(value);
  }
  if (date) {
    data.date = new Date(date);
  }
  // Remove non-Prisma fields that may have leaked through
  delete data.value;
  delete data.unit;

  const entry = await prisma.timeEntry.update({
    where: { id: params.id },
    data,
    include: { company: true, project: true },
  });
  return NextResponse.json(entry);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.timeEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

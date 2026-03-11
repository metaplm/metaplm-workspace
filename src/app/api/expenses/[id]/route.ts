import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  
  // Convert date string to Date object
  if (data.date) {
    data.date = new Date(data.date as string);
  }
  
  // Convert empty description to null
  if (data.description === "") {
    data.description = null;
  }
  
  const expense = await prisma.expense.update({
    where: { id: params.id },
    data: data as any,
    include: { deal: { include: { company: true } } },
  });
  return NextResponse.json(expense);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.expense.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

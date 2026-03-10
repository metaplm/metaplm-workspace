import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const invoice = await prisma.invoice.update({
    where: { id: params.id },
    data: { ...body, dueDate: body.dueDate ? new Date(body.dueDate) : null },
  });
  return NextResponse.json(invoice);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.invoice.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

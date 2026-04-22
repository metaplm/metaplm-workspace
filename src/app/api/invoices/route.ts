import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceSchema } from "@/lib/schemas";

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    include: { deal: { include: { company: true } }, timeEntries: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = InvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const count = await prisma.invoice.count();
  const year = new Date().getFullYear();
  const number = `GIB${year}${String(count + 1).padStart(9, "0")}`;

  const { dueDate, issuedDate, ...rest } = parsed.data;
  const invoice = await prisma.invoice.create({
    data: {
      ...rest,
      number,
      dueDate: dueDate ? new Date(dueDate) : null,
      issuedDate: issuedDate ? new Date(issuedDate) : new Date(),
    },
    include: { deal: true },
  });
  return NextResponse.json(invoice, { status: 201 });
}

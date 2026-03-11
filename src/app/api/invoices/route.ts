import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    include: { deal: { include: { company: true } }, timeEntries: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await prisma.invoice.count();
  const year = new Date().getFullYear();
  const number = `GIB${year}${String(count + 1).padStart(9, "0")}`;

  const invoice = await prisma.invoice.create({
    data: {
      ...body,
      number,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      issuedDate: body.issuedDate ? new Date(body.issuedDate) : new Date(),
    },
    include: { deal: true },
  });
  return NextResponse.json(invoice, { status: 201 });
}

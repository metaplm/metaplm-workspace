import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      contacts: true,
      deals: {
        include: { invoices: true },
        orderBy: { createdAt: "desc" },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        include: { contacts: true, deal: true },
      },
      timeEntries: {
        orderBy: { date: "desc" },
        include: { project: true },
      },
      projects: {
        orderBy: { createdAt: "desc" },
        include: { timeEntries: true },
      },
    },
  });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(company);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const company = await prisma.company.update({ where: { id: params.id }, data: body });
  return NextResponse.json(company);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.company.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

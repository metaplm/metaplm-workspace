import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const deal = await prisma.deal.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      activities: { orderBy: { createdAt: "desc" } },
      invoices: true,
      expenses: true,
    },
  });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(deal);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const previousDeal = await prisma.deal.findUnique({ where: { id: params.id } });

  const deal = await prisma.deal.update({
    where: { id: params.id },
    data: {
      ...body,
      expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
    },
    include: { company: true },
  });

  // Auto-create default category if "WON" and no time entries yet
  if (body.stage === "WON" && previousDeal?.stage !== "WON") {
    const catCount = await prisma.category.count();
    if (catCount === 0) {
      await prisma.category.createMany({
        data: [
          { name: "Consulting", defaultBillable: true, color: "#6366f1" },
          { name: "R&D", defaultBillable: false, color: "#8b5cf6" },
          { name: "Admin", defaultBillable: false, color: "#64748b" },
          { name: "Development", defaultBillable: true, color: "#06b6d4" },
          { name: "Design", defaultBillable: true, color: "#f59e0b" },
        ],
        skipDuplicates: true,
      });
    }
  }

  return NextResponse.json(deal);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.deal.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

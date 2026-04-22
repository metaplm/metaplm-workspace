import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DealSchema } from "@/lib/schemas";

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
  const parsed = DealSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const previousDeal = await prisma.deal.findUnique({ where: { id: params.id } });
  const { expectedCloseDate, ...rest } = parsed.data;

  const deal = await prisma.deal.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(expectedCloseDate !== undefined
        ? { expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null }
        : {}),
    },
    include: { company: true },
  });

  // Auto-create default categories when a deal is first moved to WON
  if (parsed.data.stage === "WON" && previousDeal?.stage !== "WON") {
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

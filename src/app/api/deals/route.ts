import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DealSchema } from "@/lib/schemas";

export async function GET() {
  const deals = await prisma.deal.findMany({
    include: {
      company: true,
      _count: { select: { activities: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = DealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { expectedCloseDate, ...rest } = parsed.data;
  const deal = await prisma.deal.create({
    data: {
      ...rest,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
    },
    include: { company: true },
  });
  return NextResponse.json(deal, { status: 201 });
}

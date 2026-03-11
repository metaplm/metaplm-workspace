import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const deal = await prisma.deal.create({
    data: {
      ...body,
      expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
    },
    include: { company: true },
  });
  return NextResponse.json(deal, { status: 201 });
}

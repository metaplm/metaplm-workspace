import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CompanySchema } from "@/lib/schemas";

export async function GET() {
  const companies = await prisma.company.findMany({
    include: { contacts: true, deals: true, _count: { select: { activities: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const company = await prisma.company.create({ data: parsed.data });
  return NextResponse.json(company, { status: 201 });
}

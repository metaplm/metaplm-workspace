import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CompanySchema } from "@/lib/schemas";

export async function GET() {
  const companies = await prisma.company.findMany({
    include: {
      contacts: true,
      deals: true,
      _count: { select: { activities: true } },
      activities: { select: { createdAt: true, nextActionDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const now = Date.now();
  const mapped = companies.map(({ activities, ...c }) => {
    const lastActivityAt = activities.length
      ? activities.reduce((max, a) => (a.createdAt > max ? a.createdAt : max), activities[0].createdAt)
      : null;
    const futureActions = activities
      .map(a => a.nextActionDate)
      .filter((d): d is Date => !!d && d.getTime() >= now)
      .sort((a, b) => a.getTime() - b.getTime());
    return { ...c, lastActivityAt, nextActionAt: futureActions[0] ?? null };
  });
  return NextResponse.json(mapped);
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

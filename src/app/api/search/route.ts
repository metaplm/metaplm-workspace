import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ companies: [], contacts: [], deals: [], activities: [] });

  const [companies, contacts, deals, activities] = await Promise.all([
    prisma.company.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, logoUrl: true, status: true },
      take: 5,
    }),
    prisma.contact.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, title: true, company: { select: { name: true } } },
      take: 5,
    }),
    prisma.deal.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, stage: true, amount: true, currency: true, company: { select: { name: true } } },
      take: 5,
    }),
    prisma.activity.findMany({
      where: { notes: { contains: q, mode: "insensitive" } },
      select: { id: true, parentId: true, rootActivityId: true, type: true, createdAt: true, notes: true, company: { select: { name: true } } },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ companies, contacts, deals, activities });
}

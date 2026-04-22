import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ActivitySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const contactId = searchParams.get("contactId");

  const activities = await prisma.activity.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      ...(contactId ? { contacts: { some: { id: contactId } } } : {}),
      parentId: null,
    },
    include: {
      company: true,
      contacts: true,
      deal: true,
      rootActivity: { include: { company: true } },
      children: {
        include: { company: true, contacts: true, deal: true, rootActivity: { include: { company: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(activities);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { contactIds, nextActionDate, createdAt, ...rest } = parsed.data;
  const activity = await prisma.activity.create({
    data: {
      ...rest,
      nextActionDate: nextActionDate ? new Date(nextActionDate) : null,
      createdAt: createdAt ? new Date(createdAt) : undefined,
      contacts: contactIds?.length ? { connect: contactIds.map(id => ({ id })) } : undefined,
    },
    include: { company: true, contacts: true, rootActivity: { include: { company: true } } },
  });
  return NextResponse.json(activity, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const contactIds: string[] = body.contactIds || [];
  const activity = await prisma.activity.create({
    data: {
      type: body.type,
      notes: body.notes,
      nextActionDate: body.nextActionDate ? new Date(body.nextActionDate) : null,
      createdAt: body.createdAt ? new Date(body.createdAt) : undefined,
      source: body.source || null,
      companyId: body.companyId || null,
      contacts: contactIds.length ? { connect: contactIds.map(id => ({ id })) } : undefined,
      parentId: body.parentId || null,
      rootActivityId: body.rootActivityId || null,
    },
    include: { company: true, contacts: true, rootActivity: { include: { company: true } } },
  });
  return NextResponse.json(activity, { status: 201 });
}

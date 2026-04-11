import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const activity = await prisma.activity.update({
    where: { id: params.id },
    data: {
      type: body.type,
      notes: body.notes,
      nextActionDate: body.nextActionDate ? new Date(body.nextActionDate) : null,
      createdAt: body.createdAt ? new Date(body.createdAt) : undefined,
      source: body.source || null,
      companyId: body.companyId || null,
      contactId: body.contactId || null,
      rootActivityId: body.rootActivityId || null,
    },
    include: { company: true, contact: true, deal: true, rootActivity: true },
  });
  return NextResponse.json(activity);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.activity.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

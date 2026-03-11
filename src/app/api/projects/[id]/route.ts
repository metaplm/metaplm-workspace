import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.companyId !== undefined) data.companyId = body.companyId;
  if (body.estimateDate !== undefined) data.estimateDate = body.estimateDate ? new Date(body.estimateDate) : null;
  if (body.defaultBillable !== undefined) data.defaultBillable = body.defaultBillable;

  const project = await prisma.project.update({
    where: { id: params.id },
    data,
    include: { company: true },
  });
  return NextResponse.json(project);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.project.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

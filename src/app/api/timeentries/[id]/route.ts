import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const entry = await prisma.timeEntry.update({ where: { id: params.id }, data: body });
  return NextResponse.json(entry);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.timeEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

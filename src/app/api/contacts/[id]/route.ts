import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ContactSchema } from "@/lib/schemas";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      company: { include: { deals: { orderBy: { createdAt: "desc" } } } },
      activities: { include: { company: true, deal: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contact);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = ContactSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const contact = await prisma.contact.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(contact);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.contact.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

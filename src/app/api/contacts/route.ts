import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ContactSchema } from "@/lib/schemas";

export async function GET() {
  const contacts = await prisma.contact.findMany({
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const contact = await prisma.contact.create({ data: parsed.data });
  return NextResponse.json(contact, { status: 201 });
}

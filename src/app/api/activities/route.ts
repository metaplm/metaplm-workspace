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
      ...(contactId ? { contactId } : {}),
    },
    include: { company: true, contact: true, deal: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(activities);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const activity = await prisma.activity.create({
    data: body,
    include: { company: true, contact: true },
  });
  return NextResponse.json(activity, { status: 201 });
}

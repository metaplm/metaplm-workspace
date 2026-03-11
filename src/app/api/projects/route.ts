import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  const where: Record<string, unknown> = {};
  if (companyId) where.companyId = companyId;

  const projects = await prisma.project.findMany({
    where,
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const project = await prisma.project.create({
    data: {
      name: body.name,
      companyId: body.companyId,
      estimateDate: body.estimateDate ? new Date(body.estimateDate) : null,
      defaultBillable: body.defaultBillable ?? true,
    },
    include: { company: true },
  });
  return NextResponse.json(project, { status: 201 });
}

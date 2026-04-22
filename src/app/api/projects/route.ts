import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProjectSchema } from "@/lib/schemas";

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
  const parsed = ProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { estimateDate, ...rest } = parsed.data;
  const project = await prisma.project.create({
    data: {
      ...rest,
      estimateDate: estimateDate ? new Date(estimateDate) : null,
    },
    include: { company: true },
  });
  return NextResponse.json(project, { status: 201 });
}

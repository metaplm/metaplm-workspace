import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  if (categories.length === 0) {
    await prisma.category.createMany({
      data: [
        { name: "Consulting", defaultBillable: true, color: "#6366f1" },
        { name: "R&D", defaultBillable: false, color: "#8b5cf6" },
        { name: "Admin", defaultBillable: false, color: "#64748b" },
        { name: "Development", defaultBillable: true, color: "#06b6d4" },
        { name: "Design", defaultBillable: true, color: "#f59e0b" },
      ],
      skipDuplicates: true,
    });
    categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  }
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const cat = await prisma.category.create({ data: body });
  return NextResponse.json(cat, { status: 201 });
}

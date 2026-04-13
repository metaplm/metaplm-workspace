import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const activityId = params.id;
  const body = await req.json().catch(() => ({}));

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: { company: true, contacts: true },
  });

  if (!activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  if (activity.dealId) {
    return NextResponse.json({ error: "Activity already linked to a deal" }, { status: 409 });
  }

  const firstContact = activity.contacts?.[0];
  const fallbackTitle =
    (typeof body?.title === "string" ? body.title.trim() : undefined) ??
    activity.notes?.slice(0, 80) ??
    `${activity.type} with ${
      activity.company?.name ??
      (firstContact ? `${firstContact.firstName ?? ""} ${firstContact.lastName ?? ""}`.trim() : "prospect")
    }`.trim();

  const parsedAmount = typeof body?.amount === "number" ? body.amount : Number(body?.amount ?? 0);
  const currency: Currency =
    typeof body?.currency === "string" && ["USD", "EUR", "TRY"].includes(body.currency)
      ? (body.currency as Currency)
      : "TRY";

  const deal = await prisma.deal.create({
    data: {
      title: fallbackTitle || "New Deal",
      amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
      currency,
      stage: "LEAD",
      companyId: activity.companyId,
      activities: { connect: { id: activity.id } },
    },
  });
  return NextResponse.json({ deal }, { status: 201 });
}

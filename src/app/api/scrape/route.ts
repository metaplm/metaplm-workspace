import { NextRequest, NextResponse } from "next/server";
import { scrapeCompanyFromUrl } from "@/lib/scraper";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });
  try {
    const data = await scrapeCompanyFromUrl(url);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Scrape failed" }, { status: 500 });
  }
}

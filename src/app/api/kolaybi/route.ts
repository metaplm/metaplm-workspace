import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.KOLAYBI_BASE_URL ?? "https://ofis-sandbox-api.kolaybi.com/kolaybi/v1";
const CHANNEL = process.env.KOLAYBI_CHANNEL ?? "";
const API_KEY = process.env.KOLAYBI_API_KEY ?? "";

// Simple in-memory token cache (resets on cold start)
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const res = await fetch(`${BASE}/access_token`, {
    method: "POST",
    headers: { Channel: CHANNEL, "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: API_KEY }),
  });

  if (!res.ok) throw new Error(`KolayBi auth failed: ${res.status}`);
  const data = await res.json();
  const token: string = data.data ?? data.access_token ?? data.token ?? data.data?.access_token;
  if (!token) throw new Error("No token in KolayBi response");

  cachedToken = { value: token, expiresAt: Date.now() + 50 * 60 * 1000 }; // 50 min
  return token;
}

async function kolaybiGet(path: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Channel: CHANNEL },
  });
  if (!res.ok) throw new Error(`KolayBi ${path} failed: ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
    return NextResponse.json({ error: "KOLAYBI_API_KEY not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const resource = searchParams.get("resource") ?? "invoices";

  const allowed = ["invoices", "associates", "products"];
  if (!allowed.includes(resource)) {
    return NextResponse.json({ error: "Invalid resource" }, { status: 400 });
  }

  try {
    const data = await kolaybiGet(`/${resource}`);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

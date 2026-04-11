import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
  }

  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ expenses: [] });
  }

  const today = new Date().toISOString().slice(0, 10);

  const prompt = `Sen bir muhasebe asistanısın. Verilen metinden harcamaları çıkar.

Kategoriler:
- ARAC: araç, taşıt, otopark, köprü, otoyol geçiş
- YEMEK: yemek, restoran, kafe, market, bakkal, manav, supermarket
- MUHASEBE: muhasebe, mali müşavir, smmm, noter hizmetleri
- DEMIRBAS: ekipman, bilgisayar, mobilya, ofis malzemesi
- GENEL: diğer, genel harcamalar
- VERGI: vergi, sgk, belediye vergisi
- KIRA: kira, aidat
- AKARYAKIT: yakıt, benzin, motorin, LPG, petrol ofisi, shell, bp, opet, total

Para birimi bulunamazsa TRY varsay. Tarih bulunamazsa bugünü kullan: ${today}.
Alacak/gelir işlemlerini (+ ile gösterilen) dahil etme, sadece harcamaları (borç/gider) çıkar.
Amount her zaman pozitif sayı olmalı.

Yanıtı SADECE geçerli bir JSON array olarak ver, başka hiçbir metin ekleme:
[{"description":"...","amount":0,"currency":"TRY","category":"GENEL","date":"YYYY-MM-DD"}]

Metin:
${text}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    // Strip markdown code blocks if present
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let expenses: unknown;
    try {
      expenses = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: "AI could not parse the text into expenses", raw }, { status: 422 });
    }

    if (!Array.isArray(expenses)) {
      return NextResponse.json({ error: "Unexpected response format", raw }, { status: 422 });
    }

    // Sanitize each item
    const valid = (expenses as Record<string, unknown>[]).filter(e => e.amount && Number(e.amount) > 0).map(e => ({
      description: String(e.description || ""),
      amount: Math.abs(Number(e.amount)),
      currency: ["TRY", "USD", "EUR"].includes(String(e.currency)) ? String(e.currency) : "TRY",
      category: ["ARAC", "YEMEK", "MUHASEBE", "DEMIRBAS", "GENEL", "VERGI", "KIRA", "AKARYAKIT"].includes(String(e.category))
        ? String(e.category)
        : "GENEL",
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(e.date)) ? String(e.date) : today,
    }));

    return NextResponse.json({ expenses: valid });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

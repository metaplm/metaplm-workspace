import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ScrapedContact {
  firstName?: string;
  lastName?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  companyName?: string;
}

const GEMINI_PROMPT = (content: string, linkedinUrl?: string) => `
Sen bir veri çıkarma asistanısın. Aşağıdaki metinden bir kişinin bilgilerini çıkar.
LinkedIn profili kopyalanmış metin veya herhangi bir profil içeriği olabilir.

İçerik:
${content.slice(0, 8000)}

Yanıtı SADECE geçerli JSON olarak ver, başka hiçbir metin ekleme:
{
  "firstName": "...",
  "lastName": "...",
  "title": "...",
  "email": "...",
  "phone": "...",
  "linkedinUrl": "${linkedinUrl || "..."}",
  "companyName": "..."
}

Kurallar:
- Bulunamayan alanlar için null kullan
- Email ve telefon metinde açıkça yoksa null ver, tahmin etme
- title: kişinin iş unvanı (örn: "Software Engineer at Acme", "CEO")
- companyName: şu anki çalıştığı şirket adı
${linkedinUrl ? `- linkedinUrl için şunu kullan: ${linkedinUrl}` : "- linkedinUrl metinde geçiyorsa al, yoksa null"}
`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
  }

  const body = await req.json();
  const { text, url } = body as { text?: string; url?: string };

  let content = "";
  let linkedinUrl: string | undefined;

  if (text?.trim()) {
    // Mode 1: user pasted raw text
    content = text.trim();
    // Try to extract a linkedin URL from the pasted text
    const linkedinMatch = text.match(/https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[^\s"'<>]+/i);
    if (linkedinMatch) linkedinUrl = linkedinMatch[0];
  } else if (url?.trim()) {
    // Mode 2: URL fetch (works for non-LinkedIn sites)
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    linkedinUrl = normalizedUrl.includes("linkedin.com") ? normalizedUrl : undefined;

    let html = "";
    try {
      const res = await fetch(normalizedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
        },
        signal: AbortSignal.timeout(10000),
      });
      html = await res.text();
    } catch {
      return NextResponse.json({ error: "Sayfa yüklenemedi. URL yerine profil metnini yapıştırmayı deneyin." }, { status: 422 });
    }

    // Extract readable parts
    const metaTags = (html.match(/<meta[^>]+>/gi) || []).join("\n");
    const titleTag = (html.match(/<title>[^<]*<\/title>/i) || [""])[0];
    const headings = (html.match(/<h[1-3][^>]*>[^<]{2,100}<\/h[1-3]>/gi) || []).slice(0, 10).join("\n");
    // Strip all tags and get visible text
    const bodyText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .slice(0, 4000);
    content = [titleTag, metaTags, headings, bodyText].join("\n");
    if (!linkedinUrl) linkedinUrl = normalizedUrl;
  } else {
    return NextResponse.json({ error: "text veya url gerekli" }, { status: 400 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(GEMINI_PROMPT(content, linkedinUrl));
    const raw = result.response.text().trim();
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let contact: ScrapedContact;
    try {
      contact = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: "Bilgiler parse edilemedi", raw }, { status: 422 });
    }

    const cleaned: ScrapedContact = {};
    if (contact.firstName) cleaned.firstName = String(contact.firstName);
    if (contact.lastName) cleaned.lastName = String(contact.lastName);
    if (contact.title) cleaned.title = String(contact.title);
    if (contact.email) cleaned.email = String(contact.email);
    if (contact.phone) cleaned.phone = String(contact.phone);
    if (contact.linkedinUrl) cleaned.linkedinUrl = String(contact.linkedinUrl);
    if (contact.companyName) cleaned.companyName = String(contact.companyName);

    return NextResponse.json(cleaned);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

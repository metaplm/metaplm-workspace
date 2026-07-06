// Tek kaynak: gider kategorileri. Prisma enum'u (ExpenseCategory) ile birebir aynı olmalı.
export const EXPENSE_CATEGORY_VALUES = [
  "ARAC",
  "ARAC_GENEL",
  "AKARYAKIT",
  "YEMEK",
  "SEYAHAT",
  "YAZILIM",
  "OFIS",
  "KIRA",
  "MUHASEBE",
  "DEMIRBAS",
  "SIGORTA",
  "MAAS",
  "VERGI",
  "GENEL",
] as const;

export type ExpenseCategoryValue = (typeof EXPENSE_CATEGORY_VALUES)[number];

export const EXPENSE_CATEGORIES: { value: ExpenseCategoryValue; label: string; hint: string }[] = [
  { value: "ARAC", label: "Araç Kirası", hint: "araç kiralama, filo kirası (hedef filo, hedeffilo.com)" },
  { value: "ARAC_GENEL", label: "Araç Genel", hint: "otopark (ispark, selfpark), köprü/otoyol geçiş, oto yıkama, araç bakım-onarım" },
  { value: "AKARYAKIT", label: "Akaryakıt", hint: "yakıt, benzin, motorin, LPG; petrol istasyonları (petrol ofisi, shell, bp, opet, total, aytemiz) ve yakıt kartları (meteorcard)" },
  { value: "YEMEK", label: "Yemek", hint: "restoran, kafe, market, bakkal, yemek kartı (pluxee); petrol istasyonundaki küçük tutarlı market/büfe alışverişleri" },
  { value: "SEYAHAT", label: "Seyahat", hint: "otel/konaklama (agoda, booking), uçak, feribot (ido.com.tr), havalimanı" },
  { value: "YAZILIM", label: "Yazılım", hint: "yazılım ve AI abonelikleri (anthropic/claude, openrouter, windsurf, ollama, nous research), hosting, domain" },
  { value: "OFIS", label: "Ofis", hint: "internet (turknet), kargo, matbaa, baskı, kırtasiye" },
  { value: "KIRA", label: "Kira", hint: "ofis kirası, aidat" },
  { value: "MUHASEBE", label: "Muhasebe", hint: "muhasebe, mali müşavir, smmm, noter hizmetleri" },
  { value: "DEMIRBAS", label: "Demirbaş", hint: "ekipman, bilgisayar, elektronik, mobilya (amazon, hepsiburada, mediamarkt, n11)" },
  { value: "SIGORTA", label: "Sigorta", hint: "sigorta poliçeleri (allianz vb.)" },
  { value: "MAAS", label: "Maaş", hint: "maaş, personel ödemesi, ortak/şahıs hesabına yapılan ücret transferleri" },
  { value: "VERGI", label: "Vergi", hint: "vergi, KDV, stopaj, geçici vergi, SGK, belediye vergisi" },
  { value: "GENEL", label: "Genel", hint: "hiçbirine uymayan diğer harcamalar" },
];

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map(c => [c.value, c.label])
);

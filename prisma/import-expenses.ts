import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

function parseCSVLine(line: string): string[] {
  return line.split(';').map(s => s.trim())
}

function parseDate(dateStr: string): Date {
  // Format: DD.MM.YYYY HH:MM
  const [datePart] = dateStr.split(' ')
  const [day, month, year] = datePart.split('.')
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
}

function parseAmount(amountStr: string): number {
  // Format: -790,00 or 61.710,00
  return parseFloat(amountStr.replace('.', '').replace(',', '.'))
}

function inferCategory(description: string, islemType: string): string | null {
  const lower = description.toLowerCase()
  const islem = islemType.toLowerCase()
  
  // Vergi tahsilatları
  if (islem.includes('vergi') || lower.includes('vergi') || lower.includes('kdv') || lower.includes('stopaj')) {
    return 'VERGI'
  }
  
  // Muhasebe ödemeleri
  if (lower.includes('muhasebe')) {
    return 'MUHASEBE'
  }
  
  // Masraf/komisyon
  if (lower.includes('masraf') || lower.includes('komisyon') || lower.includes('ücret')) {
    return 'GENEL'
  }
  
  // Bilinmeyen - null bırak
  return null
}

async function main() {
  const csvPath = path.join(__dirname, '..', 'public', 'HesapEkstresi.csv')
  const raw = fs.readFileSync(csvPath, 'utf-8')
  const lines = raw.split('\n').filter(l => l.trim())

  // Skip header (first 7 lines)
  const dataLines = lines.slice(7)

  let created = 0
  let skipped = 0

  for (const line of dataLines) {
    const cols = parseCSVLine(line)
    
    // Columns: HESAP NO, FİŞ NO, HAREKET TARIH, İŞLEM TARİHİ, KART NO, İŞLEM, TUTAR, BAKİYE, KANAL, İŞLEM NO, REFERANS, HAVALE, REF NO, TCKN, VKN, B/A, AÇIKLAMA
    const hareketTarih = cols[2]
    const islemType = cols[5]
    const tutarStr = cols[6]
    const aciklama = cols[16] || ''

    if (!hareketTarih || !tutarStr) {
      skipped++
      continue
    }

    const date = parseDate(hareketTarih)
    const amount = Math.abs(parseAmount(tutarStr)) // Always positive for expenses
    const category = inferCategory(aciklama, islemType)
    const description = aciklama.slice(0, 500) || islemType

    // Only import expenses (negative amounts in original)
    if (tutarStr.startsWith('-')) {
      const expenseData: any = {
        date,
        amount,
        currency: 'TRY',
        description: description || null,
      }
      
      // Only set category if we can infer it, otherwise leave as GENEL (default)
      if (category) {
        expenseData.category = category
      }
      
      await prisma.expense.create({ data: expenseData })
      created++
      console.log(`✅ Created: ${date.toISOString().slice(0, 10)} - ${amount} TL - ${category || 'GENEL (default)'}`)
    } else {
      skipped++
    }
  }

  console.log(`\n🎉 Import complete: ${created} expenses created, ${skipped} skipped`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

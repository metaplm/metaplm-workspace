import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseDate(dateStr: string): Date {
  // Format: DD/MM/YYYY
  const [day, month, year] = dateStr.split('/')
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
}

function inferCategory(projectName: string): 'TASK' | 'MEETING' | 'TRAINING' | 'SUPPORT' {
  const lower = projectName.toLowerCase()
  if (lower.includes('meeting') || lower.includes('toplantı')) return 'MEETING'
  if (lower.includes('training') || lower.includes('eğitim')) return 'TRAINING'
  if (lower.includes('support') || lower.includes('destek')) return 'SUPPORT'
  return 'TASK'
}

async function main() {
  const csvPath = path.join(__dirname, '..', 'public', 'Clockify_Time_Report_Detailed_01_01_2026-31_12_2026.csv')
  const raw = fs.readFileSync(csvPath, 'utf-8')
  const lines = raw.split('\n').filter(l => l.trim())

  // Skip header
  const dataLines = lines.slice(1)

  // Step 1: Collect unique companies and projects
  const companyProjectMap = new Map<string, Set<string>>()

  for (const line of dataLines) {
    const cols = parseCSVLine(line)
    const projectName = cols[0]
    const clientName = cols[1]
    if (!clientName) continue

    if (!companyProjectMap.has(clientName)) {
      companyProjectMap.set(clientName, new Set())
    }
    companyProjectMap.get(clientName)!.add(projectName)
  }

  // Step 2: Create companies
  const companyIdMap = new Map<string, string>()
  for (const companyName of companyProjectMap.keys()) {
    let company = await prisma.company.findFirst({ where: { name: companyName } })
    if (!company) {
      company = await prisma.company.create({ data: { name: companyName } })
      console.log(`✅ Created company: ${companyName}`)
    } else {
      console.log(`⏭️  Company exists: ${companyName}`)
    }
    companyIdMap.set(companyName, company.id)
  }

  // Step 3: Create projects
  const projectIdMap = new Map<string, string>() // key: "companyName::projectName"
  for (const [companyName, projectNames] of companyProjectMap.entries()) {
    const companyId = companyIdMap.get(companyName)!
    for (const projectName of projectNames) {
      const key = `${companyName}::${projectName}`
      let project = await prisma.project.findFirst({
        where: { name: projectName, companyId },
      })
      if (!project) {
        // Determine default billable from CSV data
        const relevantLines = dataLines.filter(l => {
          const c = parseCSVLine(l)
          return c[0] === projectName && c[1] === companyName
        })
        const hasBillable = relevantLines.some(l => parseCSVLine(l)[8] === 'Yes')
        project = await prisma.project.create({
          data: { name: projectName, companyId, defaultBillable: hasBillable },
        })
        console.log(`✅ Created project: ${projectName} (${companyName}) [billable: ${hasBillable}]`)
      } else {
        console.log(`⏭️  Project exists: ${projectName} (${companyName})`)
      }
      projectIdMap.set(key, project.id)
    }
  }

  // Step 4: Import time entries
  let created = 0
  let skipped = 0
  for (const line of dataLines) {
    const cols = parseCSVLine(line)
    const projectName = cols[0]
    const clientName = cols[1]
    const description = cols[2]
    const billableStr = cols[8]
    const startDateStr = cols[9]
    const durationDecimal = parseFloat(cols[14])

    if (!clientName || !startDateStr) { skipped++; continue }

    const companyId = companyIdMap.get(clientName)
    const projectKey = `${clientName}::${projectName}`
    const projectId = projectIdMap.get(projectKey)

    if (!companyId) { skipped++; continue }

    const date = parseDate(startDateStr)
    const billable = billableStr === 'Yes'
    const category = inferCategory(projectName)
    const notes = description || undefined

    await prisma.timeEntry.create({
      data: {
        date,
        hours: durationDecimal,
        category,
        billable,
        companyId,
        projectId: projectId || null,
        notes,
      },
    })
    created++
  }

  console.log(`\n🎉 Import complete: ${created} entries created, ${skipped} skipped`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

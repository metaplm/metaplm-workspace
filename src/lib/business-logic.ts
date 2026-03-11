/**
 * Core Business Logic
 * - Time unit conversion (Days ↔ Hours, rule: 1 Day = 8 Hours)
 * - Deal stage transitions and automatic project creation
 */

// ─── Time Conversion ────────────────────────────────────────────────────────

export const HOURS_PER_DAY = 8

export type TimeUnit = 'hours' | 'days'

/**
 * Parse a user-entered time string into decimal hours.
 * Accepts: "1d", "0.5 days", "4h", "4 hours", "90m", "1.5"
 */
export function parseTimeInput(input: string, preferredUnit: TimeUnit = 'hours'): number {
  const trimmed = input.trim().toLowerCase()

  // Match patterns like "1d", "0.5 days", "1 day"
  const dayMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*d(?:ay)?s?$/)
  if (dayMatch) {
    return parseFloat(dayMatch[1]) * HOURS_PER_DAY
  }

  // Match patterns like "4h", "4 hours", "4 hr"
  const hourMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*h(?:r|ours?)?$/)
  if (hourMatch) {
    return parseFloat(hourMatch[1])
  }

  // Match minutes: "90m", "90 min"
  const minMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?$/)
  if (minMatch) {
    return parseFloat(minMatch[1]) / 60
  }

  // Plain number — interpret based on preferred unit
  const numMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/)
  if (numMatch) {
    const val = parseFloat(numMatch[1])
    return preferredUnit === 'days' ? val * HOURS_PER_DAY : val
  }

  throw new Error(`Cannot parse time input: "${input}"`)
}

/**
 * Format stored hours for display.
 * e.g. 4h → "0.5d" or "4h"
 */
export function formatHours(hours: number, unit: TimeUnit = 'hours'): string {
  if (unit === 'days') {
    const days = hours / HOURS_PER_DAY
    return `${days % 1 === 0 ? days : days.toFixed(2)}d`
  }
  return `${hours % 1 === 0 ? hours : hours.toFixed(2)}h`
}

/**
 * Determine calendar day color-coding based on total logged hours.
 */
export type DayStatus = 'empty' | 'incomplete' | 'optimal' | 'overtime'

export function getDayStatus(totalHours: number): DayStatus {
  if (totalHours === 0) return 'empty'
  if (totalHours < HOURS_PER_DAY) return 'incomplete'
  if (totalHours === HOURS_PER_DAY) return 'optimal'
  return 'overtime'
}

export const DAY_STATUS_STYLES: Record<DayStatus, { bg: string; text: string; border: string; label: string }> = {
  empty:      { bg: 'bg-ink-800',     text: 'text-ink-500',   border: 'border-ink-700', label: 'No entries' },
  incomplete: { bg: 'bg-yellow-950',  text: 'text-yellow-400', border: 'border-yellow-800', label: 'Incomplete' },
  optimal:    { bg: 'bg-green-950',   text: 'text-green-400',  border: 'border-green-800',  label: 'Optimal' },
  overtime:   { bg: 'bg-orange-950',  text: 'text-orange-400', border: 'border-orange-800', label: 'Overtime' },
}

// ─── Deal → Project Logic ────────────────────────────────────────────────────

import { prisma } from './prisma'
import { DealStage } from '@prisma/client'

/**
 * Transition a deal to a new stage.
 * When stage becomes WON, automatically marks wonAt timestamp.
 * (The "project" in this system IS the Won Deal — timesheet entries are logged against it.)
 */
export async function transitionDeal(dealId: string, newStage: DealStage) {
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } })

  const wasAlreadyWon = deal.stage === DealStage.WON
  const isNowWon      = newStage === DealStage.WON

  const updated = await prisma.deal.update({
    where: { id: dealId },
    data:  { stage: newStage },
    include: { company: true },
  })

  return { deal: updated, projectCreated: isNowWon && !wasAlreadyWon }
}

/**
 * Return all deals that have WON stage = active "projects" for timesheet logging.
 */
export async function getActiveProjects() {
  return prisma.deal.findMany({
    where:   { stage: DealStage.WON },
    include: { company: { select: { name: true, logoUrl: true } } },
    orderBy: { updatedAt: 'desc' },
  })
}

// ─── Invoice Auto-Draft ──────────────────────────────────────────────────────

/**
 * Pull all billable, un-invoiced time entries for a company within a date range
 * and generate a draft invoice with line items grouped by category.
 */
export async function generateDraftInvoice({
  companyId,
  projectId,
  fromDate,
  toDate,
  currency,
  hourlyRate,
  dueDate,
}: {
  companyId: string
  projectId?: string
  fromDate: Date
  toDate:   Date
  currency: 'USD' | 'EUR' | 'TRY'
  hourlyRate: number
  dueDate: Date
}) {
  const entries = await prisma.timeEntry.findMany({
    where: {
      billable: true,
      date:     { gte: fromDate, lte: toDate },
      companyId,
      ...(projectId ? { projectId } : {}),
    },
    include: { company: true, project: true },
    orderBy: { date: 'asc' },
  })

  if (entries.length === 0) throw new Error('No billable time entries found for the given period.')

  // Group entries by category
  const grouped = entries.reduce<Record<string, { hours: number; entries: typeof entries }>>((acc, e) => {
    if (!acc[e.category]) acc[e.category] = { hours: 0, entries: [] }
    acc[e.category].hours += e.hours
    acc[e.category].entries.push(e)
    return acc
  }, {})

  const totalAmount = Object.values(grouped).reduce((sum, { hours }) => sum + hours * hourlyRate, 0)

  // Generate invoice number: INV-YYYYMM-XXXX
  const count = await prisma.invoice.count()
  const number = `INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(count + 1).padStart(4, '0')}`

  const invoice = await prisma.invoice.create({
    data: {
      number,
      amount:    totalAmount,
      currency,
      status:    'DRAFT',
      dueDate,
    },
    include: { deal: { include: { company: true } }, timeEntries: true },
  })

  await prisma.timeEntry.updateMany({
    where: { id: { in: entries.map((entry) => entry.id) } },
    data: { invoiceId: invoice.id },
  })

  return invoice
}

// ─── 30-Day Cash Flow Projection ─────────────────────────────────────────────

export async function getCashFlowProjection() {
  const today = new Date()
  const in30  = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [pendingInvoices, upcomingExpenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { in: ['PENDING', 'DRAFT'] }, dueDate: { lte: in30 } },
      select: { amount: true, currency: true, dueDate: true, status: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: today, lte: in30 } },
      select: { amount: true, currency: true, date: true, category: true },
    }),
  ])

  return { pendingInvoices, upcomingExpenses }
}

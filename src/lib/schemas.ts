import { z } from 'zod'

const dateStr = z.string().max(100).refine(s => !isNaN(Date.parse(s)), 'Invalid date')
const optionalDate = dateStr.optional().nullable()
const optionalId = z.string().max(100).optional().nullable()

export const CompanySchema = z.object({
  name: z.string().min(1).max(200),
  website: z.string().max(500).optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  linkedinUrl: z.string().max(500).optional().nullable(),
  nda: z.boolean().optional(),
})

export const ContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  title: z.string().max(200).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  linkedinUrl: z.string().max(500).optional().nullable(),
  companyId: optionalId,
})

export const DealSchema = z.object({
  title: z.string().min(1).max(200),
  amount: z.number().nonnegative().optional(),
  currency: z.enum(['USD', 'EUR', 'TRY']).optional(),
  stage: z.enum(['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
  expectedCloseDate: optionalDate,
  companyId: optionalId,
})

export const ActivitySchema = z.object({
  type: z.enum(['MEETING', 'CALL', 'EMAIL', 'NOTE']),
  notes: z.string().max(10000).optional().nullable(),
  nextActionDate: optionalDate,
  createdAt: optionalDate,
  source: z.string().max(200).optional().nullable(),
  companyId: optionalId,
  contactIds: z.array(z.string().max(100)).max(50).optional(),
  parentId: optionalId,
  rootActivityId: optionalId,
})

export const ExpenseSchema = z.object({
  description: z.string().max(500).optional().nullable(),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'TRY']).optional(),
  category: z.enum(['ARAC', 'YEMEK', 'MUHASEBE', 'DEMIRBAS', 'GENEL', 'VERGI', 'KIRA', 'AKARYAKIT']).optional(),
  date: z.string().max(100).optional().nullable(),
  dealId: optionalId,
})

export const InvoiceSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'TRY']).optional(),
  vatRate: z.number().int().min(0).max(100).optional(),
  status: z.enum(['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  dueDate: optionalDate,
  issuedDate: optionalDate,
  dealId: optionalId,
  notes: z.string().max(2000).optional().nullable(),
  vatAmount: z.number().nonnegative().optional(),
})

export const TimeEntrySchema = z.object({
  date: z.string().min(1).max(100),
  hours: z.number().positive().max(24).optional(),
  value: z.union([z.string().max(20), z.number()]).optional(),
  unit: z.enum(['hours', 'days']).optional(),
  category: z.enum(['TASK', 'MEETING', 'TRAINING', 'SUPPORT']).optional(),
  billable: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
  companyId: optionalId,
  projectId: optionalId,
  invoiceId: optionalId,
})

export const ProjectSchema = z.object({
  name: z.string().min(1).max(200),
  companyId: z.string().min(1).max(100),
  estimateDate: optionalDate,
  defaultBillable: z.boolean().optional(),
})

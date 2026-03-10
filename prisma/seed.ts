import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed default categories
  const categories = [
    { name: 'Consulting', defaultBillable: true, color: '#6366f1' },
    { name: 'Development', defaultBillable: true, color: '#8b5cf6' },
    { name: 'R&D', defaultBillable: false, color: '#3b82f6' },
    { name: 'Admin', defaultBillable: false, color: '#6b7280' },
    { name: 'Sales', defaultBillable: false, color: '#f59e0b' },
    { name: 'Support', defaultBillable: true, color: '#10b981' },
    { name: 'Training', defaultBillable: true, color: '#ec4899' },
    { name: 'Design', defaultBillable: true, color: '#f97316' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }

  console.log('✅ Seed completed: categories loaded')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

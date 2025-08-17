import { PrismaClient } from '@prisma/client'
import { seedPopulations } from './populations'
import { seedDiseases } from './diseases'
import { seedLabPanels } from './lab-panels'
import { seedLabTests } from './lab-tests'
import { seedMedications } from './medications'
import { seedRegimens } from './regimens'
import { seedRoles } from './roles'
import { seedFacilities } from './facilities'
import { seedUsers } from './users'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')
  
  try {
    await seedRoles()
    await seedFacilities()
    await seedUsers()
    await seedPopulations()
    await seedDiseases()
    await seedLabPanels()
    await seedLabTests()
    await seedMedications()
    await seedRegimens()
    
    console.log('✅ Database seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
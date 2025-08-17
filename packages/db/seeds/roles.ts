import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedRoles() {
  const roles = [
    { name: 'PHYSICIAN' },
    { name: 'NURSE' },
    { name: 'CASE_MANAGER' },
    { name: 'ENCODER' },
    { name: 'ADMIN' },
    { name: 'DIRECTOR' },
    { name: 'DATA_ANALYST' },
    { name: 'PHARMACIST' }
  ]

  console.log('Seeding user roles...')
  
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role
    })
  }
  
  console.log(`✓ Seeded ${roles.length} user roles`)
}

if (require.main === module) {
  seedRoles()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
}
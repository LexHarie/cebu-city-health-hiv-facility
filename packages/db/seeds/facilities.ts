import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedFacilities() {
  const facilities = [
    {
      name: 'Cebu City Health Department',
      code: 'CCHD',
      address: 'Capitol Site, Cebu City, Philippines'
    },
    {
      name: 'Vicente Sotto Memorial Medical Center',
      code: 'VSMMC',
      address: 'B. Rodriguez St, Cebu City, Philippines'
    },
    {
      name: 'Cebu City Medical Center',
      code: 'CCMC', 
      address: 'Colon St, Cebu City, Philippines'
    },
    {
      name: 'Basak Pardo Health Center',
      code: 'BPHC',
      address: 'Basak Pardo, Cebu City, Philippines'
    },
    {
      name: 'Lahug Health Center',
      code: 'LHC',
      address: 'Lahug, Cebu City, Philippines'
    },
    {
      name: 'Tisa Health Center',
      code: 'THC',
      address: 'Tisa, Cebu City, Philippines'
    }
  ]

  console.log('Seeding health facilities...')
  
  for (const facility of facilities) {
    await prisma.facility.upsert({
      where: { code: facility.code },
      update: { name: facility.name, address: facility.address },
      create: facility
    })
  }
  
  console.log(`✓ Seeded ${facilities.length} health facilities`)
}

if (require.main === module) {
  seedFacilities()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
}
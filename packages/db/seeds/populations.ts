import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedPopulations() {
  const populations = [
    // Key populations
    { type: 'population', code: 'MSM', label: 'Men who have sex with men' },
    { type: 'population', code: 'TGW', label: 'Transgender women' },
    { type: 'population', code: 'TGM', label: 'Transgender men' },
    { type: 'population', code: 'PWID', label: 'People who inject drugs' },
    { type: 'population', code: 'FSW', label: 'Female sex workers' },
    { type: 'population', code: 'MSW', label: 'Male sex workers' },
    { type: 'population', code: 'PLHIV', label: 'People living with HIV' },
    
    // Demographic groups
    { type: 'population', code: 'YKP', label: 'Young Key Population (15-24 years)' },
    { type: 'population', code: 'PREGNANT', label: 'Pregnant women' },
    { type: 'population', code: 'MIGRANT', label: 'Migrant workers' },
    { type: 'population', code: 'OFW', label: 'Overseas Filipino workers' },
    { type: 'population', code: 'SEAFARER', label: 'Seafarers' },
    { type: 'population', code: 'DETAINED', label: 'Persons in detention' },
    
    // Risk categories
    { type: 'population', code: 'HIGH_RISK', label: 'High risk for HIV' },
    { type: 'population', code: 'DISCORDANT', label: 'HIV discordant couple' },
    { type: 'population', code: 'OCCUPATIONAL', label: 'Occupational exposure risk' },
  ]

  console.log('Seeding populations...')
  
  for (const pop of populations) {
    await prisma.lookup.upsert({
      where: { type_code: { type: pop.type, code: pop.code } },
      update: { label: pop.label },
      create: pop
    })
  }
  
  console.log(`✓ Seeded ${populations.length} population types`)
}

if (require.main === module) {
  seedPopulations()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
}
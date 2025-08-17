import { PrismaClient, MedicationCategory } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedRegimens() {
  console.log('Seeding regimens...')
  
  // Get medication IDs first
  const tdf = await prisma.medication.findFirst({ where: { code: 'TDF' } })
  const taf = await prisma.medication.findFirst({ where: { code: 'TAF' } })
  const ftc = await prisma.medication.findFirst({ where: { code: 'FTC' } })
  const dtg = await prisma.medication.findFirst({ where: { code: 'DTG' } })
  const efv = await prisma.medication.findFirst({ where: { code: 'EFV' } })
  const inh = await prisma.medication.findFirst({ where: { code: 'INH' } })
  const rpt = await prisma.medication.findFirst({ where: { code: 'RPT' } })
  const rif = await prisma.medication.findFirst({ where: { code: 'RIF' } })
  const tld = await prisma.medication.findFirst({ where: { code: 'TLD' } })
  const truvada = await prisma.medication.findFirst({ where: { code: 'TRUVADA' } })
  const descovy = await prisma.medication.findFirst({ where: { code: 'DESCOVY' } })
  
  const regimens = [
    // First-line ARV regimens
    {
      name: 'TLD (Tenofovir/Lamivudine/Dolutegravir)',
      category: MedicationCategory.ARV,
      items: tld ? [{ medicationId: tld.id, qtyPerDose: 1, unit: 'tablet' }] : []
    },
    {
      name: 'TDF/FTC/DTG',
      category: MedicationCategory.ARV, 
      items: tdf && ftc && dtg ? [
        { medicationId: tdf.id, qtyPerDose: 1, unit: 'tablet' },
        { medicationId: ftc.id, qtyPerDose: 1, unit: 'tablet' },
        { medicationId: dtg.id, qtyPerDose: 1, unit: 'tablet' }
      ] : []
    },
    {
      name: 'TDF/FTC/EFV',
      category: MedicationCategory.ARV,
      items: tdf && ftc && efv ? [
        { medicationId: tdf.id, qtyPerDose: 1, unit: 'tablet' },
        { medicationId: ftc.id, qtyPerDose: 1, unit: 'tablet' },
        { medicationId: efv.id, qtyPerDose: 1, unit: 'tablet' }
      ] : []
    },
    {
      name: 'TAF/FTC/DTG',
      category: MedicationCategory.ARV,
      items: taf && ftc && dtg ? [
        { medicationId: taf.id, qtyPerDose: 1, unit: 'tablet' },
        { medicationId: ftc.id, qtyPerDose: 1, unit: 'tablet' },
        { medicationId: dtg.id, qtyPerDose: 1, unit: 'tablet' }
      ] : []
    },
    
    // PrEP regimens
    {
      name: 'Daily PrEP (TDF/FTC)',
      category: MedicationCategory.PREP,
      items: truvada ? [{ medicationId: truvada.id, qtyPerDose: 1, unit: 'tablet' }] : []
    },
    {
      name: 'Daily PrEP (TAF/FTC)',
      category: MedicationCategory.PREP,
      items: descovy ? [{ medicationId: descovy.id, qtyPerDose: 1, unit: 'tablet' }] : []
    },
    
    // TB Prophylaxis regimens
    {
      name: '3HP (Isoniazid + Rifapentine)',
      category: MedicationCategory.TB_PROPHYLAXIS,
      items: inh && rpt ? [
        { medicationId: inh.id, qtyPerDose: 300, unit: 'mg' },
        { medicationId: rpt.id, qtyPerDose: 900, unit: 'mg' }
      ] : []
    },
    {
      name: '6H (Isoniazid monotherapy)',
      category: MedicationCategory.TB_PROPHYLAXIS,
      items: inh ? [{ medicationId: inh.id, qtyPerDose: 300, unit: 'mg' }] : []
    },
    {
      name: '4R (Rifampin monotherapy)',
      category: MedicationCategory.TB_PROPHYLAXIS,
      items: rif ? [{ medicationId: rif.id, qtyPerDose: 600, unit: 'mg' }] : []
    }
  ]

  for (const regimenData of regimens) {
    const regimen = await prisma.regimen.upsert({
      where: { name_category: { name: regimenData.name, category: regimenData.category } },
      update: {},
      create: {
        name: regimenData.name,
        category: regimenData.category
      }
    })
    
    // Delete existing regimen items and recreate
    await prisma.regimenItem.deleteMany({
      where: { regimenId: regimen.id }
    })
    
    // Create regimen items
    for (const item of regimenData.items) {
      await prisma.regimenItem.create({
        data: {
          regimenId: regimen.id,
          medicationId: item.medicationId,
          qtyPerDose: item.qtyPerDose,
          unit: item.unit
        }
      })
    }
  }
  
  console.log(`✓ Seeded ${regimens.length} medication regimens`)
}

if (require.main === module) {
  seedRegimens()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
}
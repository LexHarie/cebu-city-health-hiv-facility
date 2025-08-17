import { PrismaClient, MedicationCategory } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedMedications() {
  const medications = [
    // ARV medications
    { name: 'Tenofovir Disoproxil Fumarate (TDF)', category: MedicationCategory.ARV, code: 'TDF', extra: { strength: '300mg', class: 'NRTI' } },
    { name: 'Tenofovir Alafenamide (TAF)', category: MedicationCategory.ARV, code: 'TAF', extra: { strength: '25mg', class: 'NRTI' } },
    { name: 'Emtricitabine (FTC)', category: MedicationCategory.ARV, code: 'FTC', extra: { strength: '200mg', class: 'NRTI' } },
    { name: 'Lamivudine (3TC)', category: MedicationCategory.ARV, code: '3TC', extra: { strength: '300mg', class: 'NRTI' } },
    { name: 'Zidovudine (AZT)', category: MedicationCategory.ARV, code: 'AZT', extra: { strength: '300mg', class: 'NRTI' } },
    { name: 'Abacavir (ABC)', category: MedicationCategory.ARV, code: 'ABC', extra: { strength: '600mg', class: 'NRTI' } },
    { name: 'Efavirenz (EFV)', category: MedicationCategory.ARV, code: 'EFV', extra: { strength: '600mg', class: 'NNRTI' } },
    { name: 'Rilpivirine (RPV)', category: MedicationCategory.ARV, code: 'RPV', extra: { strength: '25mg', class: 'NNRTI' } },
    { name: 'Dolutegravir (DTG)', category: MedicationCategory.ARV, code: 'DTG', extra: { strength: '50mg', class: 'INSTI' } },
    { name: 'Raltegravir (RAL)', category: MedicationCategory.ARV, code: 'RAL', extra: { strength: '400mg', class: 'INSTI' } },
    { name: 'Elvitegravir (EVG)', category: MedicationCategory.ARV, code: 'EVG', extra: { strength: '150mg', class: 'INSTI' } },
    { name: 'Cobicistat (COBI)', category: MedicationCategory.ARV, code: 'COBI', extra: { strength: '150mg', class: 'Booster' } },
    { name: 'Ritonavir (RTV)', category: MedicationCategory.ARV, code: 'RTV', extra: { strength: '100mg', class: 'Booster' } },
    { name: 'Darunavir (DRV)', category: MedicationCategory.ARV, code: 'DRV', extra: { strength: '800mg', class: 'PI' } },
    { name: 'Atazanavir (ATV)', category: MedicationCategory.ARV, code: 'ATV', extra: { strength: '300mg', class: 'PI' } },
    
    // Fixed-dose combinations
    { name: 'TLD (TDF/3TC/DTG)', category: MedicationCategory.ARV, code: 'TLD', extra: { strength: '300/300/50mg', class: 'FDC' } },
    { name: 'TEE (TDF/FTC/EFV)', category: MedicationCategory.ARV, code: 'TEE', extra: { strength: '300/200/600mg', class: 'FDC' } },
    { name: 'TAR (TAF/FTC/RPV)', category: MedicationCategory.ARV, code: 'TAR', extra: { strength: '25/200/25mg', class: 'FDC' } },
    
    // PrEP medications
    { name: 'Truvada (TDF/FTC)', category: MedicationCategory.PREP, code: 'TRUVADA', extra: { strength: '300/200mg', indication: 'Daily PrEP' } },
    { name: 'Descovy (TAF/FTC)', category: MedicationCategory.PREP, code: 'DESCOVY', extra: { strength: '25/200mg', indication: 'Daily PrEP' } },
    { name: 'Apretude (Cabotegravir)', category: MedicationCategory.PREP, code: 'APRETUDE', extra: { strength: '600mg/3mL', indication: 'Long-acting PrEP injection' } },
    
    // TB Prophylaxis
    { name: 'Isoniazid (INH)', category: MedicationCategory.TB_PROPHYLAXIS, code: 'INH', extra: { strength: '300mg', indication: '6-12 months IPT' } },
    { name: 'Rifapentine (RPT)', category: MedicationCategory.TB_PROPHYLAXIS, code: 'RPT', extra: { strength: '150mg', indication: '3HP regimen' } },
    { name: 'Rifampin (RIF)', category: MedicationCategory.TB_PROPHYLAXIS, code: 'RIF', extra: { strength: '600mg', indication: '4R regimen' } },
    
    // STI treatments
    { name: 'Azithromycin', category: MedicationCategory.STI, code: 'AZITHROMYCIN', extra: { strength: '1g', indication: 'Chlamydia, Gonorrhea' } },
    { name: 'Ceftriaxone', category: MedicationCategory.STI, code: 'CEFTRIAXONE', extra: { strength: '500mg', indication: 'Gonorrhea' } },
    { name: 'Doxycycline', category: MedicationCategory.STI, code: 'DOXYCYCLINE', extra: { strength: '100mg', indication: 'Chlamydia, Syphilis' } },
    { name: 'Benzathine Penicillin G', category: MedicationCategory.STI, code: 'BENZATHINE_PCN', extra: { strength: '2.4MU', indication: 'Syphilis' } },
    { name: 'Metronidazole', category: MedicationCategory.STI, code: 'METRONIDAZOLE', extra: { strength: '500mg', indication: 'Trichomonas' } },
    { name: 'Acyclovir', category: MedicationCategory.STI, code: 'ACYCLOVIR', extra: { strength: '400mg', indication: 'Herpes Simplex' } },
    { name: 'Valacyclovir', category: MedicationCategory.STI, code: 'VALACYCLOVIR', extra: { strength: '500mg', indication: 'Herpes Simplex' } },
    
    // Other relevant medications
    { name: 'Fluconazole', category: MedicationCategory.OTHER, code: 'FLUCONAZOLE', extra: { strength: '150mg', indication: 'Candidiasis' } },
    { name: 'Trimethoprim-Sulfamethoxazole', category: MedicationCategory.OTHER, code: 'BACTRIM', extra: { strength: '160/800mg', indication: 'PCP prophylaxis' } },
    { name: 'Vitamin D3', category: MedicationCategory.OTHER, code: 'VITAMIN_D3', extra: { strength: '1000IU', indication: 'Bone health' } },
    { name: 'Calcium Carbonate', category: MedicationCategory.OTHER, code: 'CALCIUM', extra: { strength: '500mg', indication: 'Bone health' } }
  ]

  console.log('Seeding medications...')
  
  for (const med of medications) {
    await prisma.medication.upsert({
      where: { name_category: { name: med.name, category: med.category } },
      update: { code: med.code, extra: med.extra },
      create: med
    })
  }
  
  console.log(`✓ Seeded ${medications.length} medications`)
}

if (require.main === module) {
  seedMedications()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
}
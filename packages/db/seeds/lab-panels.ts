import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedLabPanels() {
  const labPanels = [
    // HIV monitoring panels
    { type: 'panel_type', code: 'HIV_VIRAL_LOAD', label: 'HIV Viral Load' },
    { type: 'panel_type', code: 'CD4_COUNT', label: 'CD4 Count' },
    { type: 'panel_type', code: 'HIV_GENOTYPE', label: 'HIV Genotype/Resistance' },
    { type: 'panel_type', code: 'HIV_RAPID', label: 'HIV Rapid Test' },
    { type: 'panel_type', code: 'HIV_ELISA', label: 'HIV ELISA' },
    { type: 'panel_type', code: 'HIV_WESTERN_BLOT', label: 'HIV Western Blot' },
    
    // Routine monitoring
    { type: 'panel_type', code: 'CBC', label: 'Complete Blood Count' },
    { type: 'panel_type', code: 'COMPREHENSIVE_METABOLIC', label: 'Comprehensive Metabolic Panel' },
    { type: 'panel_type', code: 'LIVER_FUNCTION', label: 'Liver Function Tests (SGPT/SGOT)' },
    { type: 'panel_type', code: 'RENAL_FUNCTION', label: 'Renal Function (Creatinine, BUN)' },
    { type: 'panel_type', code: 'LIPID_PROFILE', label: 'Lipid Profile' },
    { type: 'panel_type', code: 'FASTING_GLUCOSE', label: 'Fasting Blood Glucose' },
    { type: 'panel_type', code: 'HBA1C', label: 'Hemoglobin A1c' },
    
    // STI screening panels
    { type: 'panel_type', code: 'SYPHILIS_SCREEN', label: 'Syphilis Screening (RPR/VDRL)' },
    { type: 'panel_type', code: 'SYPHILIS_CONFIRM', label: 'Syphilis Confirmation (TPPA/FTA-ABS)' },
    { type: 'panel_type', code: 'GONORRHEA_CHLAMYDIA', label: 'Gonorrhea/Chlamydia NAAT' },
    { type: 'panel_type', code: 'TRICHOMONAS', label: 'Trichomonas Test' },
    { type: 'panel_type', code: 'HERPES_SIMPLEX', label: 'Herpes Simplex PCR' },
    { type: 'panel_type', code: 'HPV_GENOTYPE', label: 'HPV Genotyping' },
    
    // Hepatitis screening
    { type: 'panel_type', code: 'HEPATITIS_B_SCREEN', label: 'Hepatitis B Surface Antigen' },
    { type: 'panel_type', code: 'HEPATITIS_B_PANEL', label: 'Hepatitis B Complete Panel' },
    { type: 'panel_type', code: 'HEPATITIS_C_AB', label: 'Hepatitis C Antibody' },
    { type: 'panel_type', code: 'HEPATITIS_C_RNA', label: 'Hepatitis C RNA PCR' },
    
    // TB screening
    { type: 'panel_type', code: 'TUBERCULIN_SKIN', label: 'Tuberculin Skin Test (TST)' },
    { type: 'panel_type', code: 'IGRA', label: 'Interferon Gamma Release Assay' },
    { type: 'panel_type', code: 'TB_SPUTUM', label: 'TB Sputum Examination' },
    { type: 'panel_type', code: 'TB_GENEXPERT', label: 'TB GeneXpert' },
    { type: 'panel_type', code: 'CHEST_XRAY', label: 'Chest X-Ray' },
    
    // Pregnancy
    { type: 'panel_type', code: 'PREGNANCY_TEST', label: 'Pregnancy Test (urine/serum)' },
    { type: 'panel_type', code: 'PRENATAL_PANEL', label: 'Prenatal Screening Panel' }
  ]

  console.log('Seeding lab panel types...')
  
  for (const panel of labPanels) {
    await prisma.lookup.upsert({
      where: { type_code: { type: panel.type, code: panel.code } },
      update: { label: panel.label },
      create: panel
    })
  }
  
  console.log(`✓ Seeded ${labPanels.length} lab panel types`)
}

if (require.main === module) {
  seedLabPanels()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
}
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedLabTests() {
  const labTests = [
    // HIV Viral Load tests
    { type: 'test_type', code: 'VL_COPIES', label: 'HIV Viral Load (copies/mL)', extra: { unit: 'copies/mL', refLow: 0, refHigh: 40 } },
    { type: 'test_type', code: 'VL_LOG', label: 'HIV Viral Load (log copies/mL)', extra: { unit: 'log copies/mL', refLow: 0, refHigh: 1.6 } },
    
    // CD4 Count tests
    { type: 'test_type', code: 'CD4_COUNT', label: 'CD4+ T-cell Count', extra: { unit: 'cells/μL', refLow: 500, refHigh: 1500 } },
    { type: 'test_type', code: 'CD4_PERCENT', label: 'CD4+ Percentage', extra: { unit: '%', refLow: 29, refHigh: 61 } },
    { type: 'test_type', code: 'CD8_COUNT', label: 'CD8+ T-cell Count', extra: { unit: 'cells/μL', refLow: 200, refHigh: 900 } },
    { type: 'test_type', code: 'CD4_CD8_RATIO', label: 'CD4:CD8 Ratio', extra: { unit: 'ratio', refLow: 1.0, refHigh: 4.0 } },
    
    // Complete Blood Count
    { type: 'test_type', code: 'WBC', label: 'White Blood Cell Count', extra: { unit: 'x10³/μL', refLow: 4.0, refHigh: 11.0 } },
    { type: 'test_type', code: 'RBC', label: 'Red Blood Cell Count', extra: { unit: 'x10⁶/μL', refLow: 4.2, refHigh: 5.4 } },
    { type: 'test_type', code: 'HEMOGLOBIN', label: 'Hemoglobin', extra: { unit: 'g/dL', refLow: 12.0, refHigh: 16.0 } },
    { type: 'test_type', code: 'HEMATOCRIT', label: 'Hematocrit', extra: { unit: '%', refLow: 36, refHigh: 48 } },
    { type: 'test_type', code: 'PLATELETS', label: 'Platelet Count', extra: { unit: 'x10³/μL', refLow: 150, refHigh: 450 } },
    { type: 'test_type', code: 'NEUTROPHILS', label: 'Neutrophils', extra: { unit: '%', refLow: 45, refHigh: 70 } },
    { type: 'test_type', code: 'LYMPHOCYTES', label: 'Lymphocytes', extra: { unit: '%', refLow: 20, refHigh: 45 } },
    
    // Liver Function Tests
    { type: 'test_type', code: 'ALT_SGPT', label: 'ALT (SGPT)', extra: { unit: 'U/L', refLow: 7, refHigh: 56 } },
    { type: 'test_type', code: 'AST_SGOT', label: 'AST (SGOT)', extra: { unit: 'U/L', refLow: 10, refHigh: 40 } },
    { type: 'test_type', code: 'TOTAL_BILIRUBIN', label: 'Total Bilirubin', extra: { unit: 'mg/dL', refLow: 0.3, refHigh: 1.2 } },
    { type: 'test_type', code: 'DIRECT_BILIRUBIN', label: 'Direct Bilirubin', extra: { unit: 'mg/dL', refLow: 0.0, refHigh: 0.3 } },
    { type: 'test_type', code: 'ALKALINE_PHOS', label: 'Alkaline Phosphatase', extra: { unit: 'U/L', refLow: 44, refHigh: 147 } },
    
    // Renal Function Tests
    { type: 'test_type', code: 'CREATININE', label: 'Serum Creatinine', extra: { unit: 'mg/dL', refLow: 0.6, refHigh: 1.3 } },
    { type: 'test_type', code: 'BUN', label: 'Blood Urea Nitrogen', extra: { unit: 'mg/dL', refLow: 6, refHigh: 24 } },
    { type: 'test_type', code: 'EGFR', label: 'Estimated GFR', extra: { unit: 'mL/min/1.73m²', refLow: 90, refHigh: null } },
    { type: 'test_type', code: 'URIC_ACID', label: 'Uric Acid', extra: { unit: 'mg/dL', refLow: 3.4, refHigh: 7.0 } },
    
    // Metabolic Panel
    { type: 'test_type', code: 'GLUCOSE_FASTING', label: 'Fasting Glucose', extra: { unit: 'mg/dL', refLow: 70, refHigh: 100 } },
    { type: 'test_type', code: 'GLUCOSE_RANDOM', label: 'Random Glucose', extra: { unit: 'mg/dL', refLow: 70, refHigh: 140 } },
    { type: 'test_type', code: 'HBA1C', label: 'Hemoglobin A1c', extra: { unit: '%', refLow: 4.0, refHigh: 5.6 } },
    
    // Lipid Profile
    { type: 'test_type', code: 'TOTAL_CHOLESTEROL', label: 'Total Cholesterol', extra: { unit: 'mg/dL', refLow: 0, refHigh: 200 } },
    { type: 'test_type', code: 'HDL_CHOLESTEROL', label: 'HDL Cholesterol', extra: { unit: 'mg/dL', refLow: 40, refHigh: null } },
    { type: 'test_type', code: 'LDL_CHOLESTEROL', label: 'LDL Cholesterol', extra: { unit: 'mg/dL', refLow: 0, refHigh: 100 } },
    { type: 'test_type', code: 'TRIGLYCERIDES', label: 'Triglycerides', extra: { unit: 'mg/dL', refLow: 0, refHigh: 150 } },
    
    // STI Tests
    { type: 'test_type', code: 'RPR_TITER', label: 'RPR Titer', extra: { unit: 'titer' } },
    { type: 'test_type', code: 'VDRL_TITER', label: 'VDRL Titer', extra: { unit: 'titer' } },
    { type: 'test_type', code: 'TPPA_RESULT', label: 'TPPA Result', extra: { unit: 'qualitative' } },
    { type: 'test_type', code: 'GC_NAAT', label: 'Gonorrhea NAAT', extra: { unit: 'qualitative' } },
    { type: 'test_type', code: 'CT_NAAT', label: 'Chlamydia NAAT', extra: { unit: 'qualitative' } },
    { type: 'test_type', code: 'TRICHOMONAS_PCR', label: 'Trichomonas PCR', extra: { unit: 'qualitative' } },
    { type: 'test_type', code: 'HSV_PCR', label: 'Herpes Simplex PCR', extra: { unit: 'qualitative' } },
    
    // Hepatitis Tests
    { type: 'test_type', code: 'HBSAG', label: 'Hepatitis B Surface Antigen', extra: { unit: 'qualitative' } },
    { type: 'test_type', code: 'HBSAB', label: 'Hepatitis B Surface Antibody', extra: { unit: 'mIU/mL', refLow: 10 } },
    { type: 'test_type', code: 'HBCAB', label: 'Hepatitis B Core Antibody', extra: { unit: 'qualitative' } },
    { type: 'test_type', code: 'HCV_AB', label: 'Hepatitis C Antibody', extra: { unit: 'qualitative' } },
    { type: 'test_type', code: 'HCV_RNA', label: 'Hepatitis C RNA PCR', extra: { unit: 'IU/mL' } },
    
    // TB Tests
    { type: 'test_type', code: 'TST_INDURATION', label: 'TST Induration', extra: { unit: 'mm', refLow: 0, refHigh: 5 } },
    { type: 'test_type', code: 'IGRA_RESULT', label: 'IGRA Result', extra: { unit: 'qualitative' } },
    { type: 'test_type', code: 'TB_SMEAR', label: 'TB Sputum Smear', extra: { unit: 'qualitative' } },
    { type: 'test_type', code: 'TB_CULTURE', label: 'TB Culture', extra: { unit: 'qualitative' } },
    { type: 'test_type', code: 'TB_GENEXPERT', label: 'TB GeneXpert', extra: { unit: 'qualitative' } },
    
    // Other important tests
    { type: 'test_type', code: 'PREGNANCY_BETA_HCG', label: 'Beta-hCG (Pregnancy)', extra: { unit: 'mIU/mL' } },
    { type: 'test_type', code: 'URINALYSIS', label: 'Urinalysis', extra: { unit: 'qualitative' } }
  ]

  console.log('Seeding lab test types...')
  
  for (const test of labTests) {
    await prisma.lookup.upsert({
      where: { type_code: { type: test.type, code: test.code } },
      update: { label: test.label, extra: test.extra },
      create: test
    })
  }
  
  console.log(`✓ Seeded ${labTests.length} lab test types`)
}

if (require.main === module) {
  seedLabTests()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
}
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedDiseases() {
  const diseases = [
    // STI diseases for history and screening
    { type: 'disease', code: 'SYPHILIS', label: 'Syphilis' },
    { type: 'disease', code: 'GONORRHEA', label: 'Gonorrhea' },
    { type: 'disease', code: 'CHLAMYDIA', label: 'Chlamydia' },
    { type: 'disease', code: 'TRICHOMONAS', label: 'Trichomonas' },
    { type: 'disease', code: 'HERPES_SIMPLEX', label: 'Herpes Simplex' },
    { type: 'disease', code: 'HPV', label: 'Human Papillomavirus (HPV)' },
    { type: 'disease', code: 'HEPATITIS_B', label: 'Hepatitis B' },
    { type: 'disease', code: 'HEPATITIS_C', label: 'Hepatitis C' },
    { type: 'disease', code: 'HIV', label: 'Human Immunodeficiency Virus' },
    
    // TB and related conditions
    { type: 'disease', code: 'TB_ACTIVE', label: 'Active Tuberculosis' },
    { type: 'disease', code: 'TB_LATENT', label: 'Latent Tuberculosis' },
    { type: 'disease', code: 'TB_MDR', label: 'Multi-drug Resistant TB' },
    { type: 'disease', code: 'TB_XDR', label: 'Extensively Drug-resistant TB' },
    
    // Other relevant conditions for HIV care
    { type: 'disease', code: 'CANDIDIASIS', label: 'Candidiasis' },
    { type: 'disease', code: 'PNEUMOCYSTIS', label: 'Pneumocystis Pneumonia' },
    { type: 'disease', code: 'TOXOPLASMOSIS', label: 'Toxoplasmosis' },
    { type: 'disease', code: 'CRYPTOCOCCAL', label: 'Cryptococcal Meningitis' },
    { type: 'disease', code: 'CMV', label: 'Cytomegalovirus' },
    { type: 'disease', code: 'KAPOSI_SARCOMA', label: 'Kaposi Sarcoma' },
    
    // Mental health conditions
    { type: 'disease', code: 'DEPRESSION', label: 'Depression' },
    { type: 'disease', code: 'ANXIETY', label: 'Anxiety' },
    { type: 'disease', code: 'SUBSTANCE_USE', label: 'Substance Use Disorder' }
  ]

  console.log('Seeding diseases...')
  
  for (const disease of diseases) {
    await prisma.lookup.upsert({
      where: { type_code: { type: disease.type, code: disease.code } },
      update: { label: disease.label },
      create: disease
    })
  }
  
  console.log(`✓ Seeded ${diseases.length} disease types`)
}

if (require.main === module) {
  seedDiseases()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
}
import { PrismaClient, SexAssignedAtBirth, LifecycleStatus } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedClients() {
  console.log('Seeding sample clients...')
  
  // Get facilities, populations, and users for reference
  const facilities = await prisma.facility.findMany()
  const populations = await prisma.lookup.findMany({ where: { type: 'population' } })
  const users = await prisma.user.findMany()
  
  const cchd = facilities.find(f => f.code === 'CCHD')
  const vsmmc = facilities.find(f => f.code === 'VSMMC')
  const ccmc = facilities.find(f => f.code === 'CCMC')
  
  if (!cchd || !vsmmc || !ccmc) {
    throw new Error('Required facilities not found. Please run facility seeds first.')
  }
  
  const caseManager = users.find(u => u.email.includes('cm.torres'))
  
  const clients = [
    {
      facilityId: cchd.id,
      currentFacilityId: cchd.id,
      clientCode: 'CCHD-001',
      uic: 'UIC-2024-001',
      legalSurname: 'Santos',
      legalFirst: 'Maria',
      legalMiddle: 'Cruz',
      preferredName: 'Maria',
      dateOfBirth: new Date('1990-05-15'),
      sexAtBirth: SexAssignedAtBirth.FEMALE,
      homeAddress: '123 Colon Street, Cebu City',
      contactNumber: '+639171111111',
      email: 'maria.santos@example.com',
      caseManagerId: caseManager?.id,
      dateEnrolled: new Date('2024-01-15'),
      status: LifecycleStatus.ACTIVE,
      ageAtEnrollmentYears: 34,
      lastVisitAt: new Date('2024-08-10')
    },
    {
      facilityId: cchd.id,
      currentFacilityId: cchd.id,
      clientCode: 'CCHD-002',
      uic: 'UIC-2024-002',
      legalSurname: 'Rodriguez',
      legalFirst: 'Juan',
      legalMiddle: 'Pablo',
      preferredName: 'JP',
      dateOfBirth: new Date('1985-12-03'),
      sexAtBirth: SexAssignedAtBirth.MALE,
      homeAddress: '456 Osmeña Boulevard, Cebu City',
      contactNumber: '+639172222222',
      email: 'juan.rodriguez@example.com',
      caseManagerId: caseManager?.id,
      dateEnrolled: new Date('2024-02-20'),
      status: LifecycleStatus.ACTIVE,
      ageAtEnrollmentYears: 39,
      lastVisitAt: new Date('2024-08-12')
    },
    {
      facilityId: vsmmc.id,
      currentFacilityId: vsmmc.id,
      clientCode: 'VSMMC-001',
      uic: 'UIC-2024-003',
      legalSurname: 'Garcia',
      legalFirst: 'Ana',
      legalMiddle: 'Luna',
      preferredName: 'Ana',
      dateOfBirth: new Date('1995-08-22'),
      sexAtBirth: SexAssignedAtBirth.FEMALE,
      homeAddress: '789 Jones Avenue, Cebu City',
      contactNumber: '+639173333333',
      email: 'ana.garcia@example.com',
      dateEnrolled: new Date('2024-03-10'),
      status: LifecycleStatus.ACTIVE,
      ageAtEnrollmentYears: 29,
      lastVisitAt: new Date('2024-08-14')
    }
  ]

  // Create clients
  for (const clientData of clients) {
    const client = await prisma.client.upsert({
      where: { uic: clientData.uic },
      update: clientData,
      create: clientData
    })
    
    console.log(`✓ Created client: ${clientData.legalFirst} ${clientData.legalSurname} (${clientData.clientCode})`)
    
    // Add population data for some clients
    if (populations.length > 0 && Math.random() > 0.5) {
      const randomPop = populations[Math.floor(Math.random() * populations.length)]
      if (randomPop) {
        await prisma.clientPopulationMap.upsert({
          where: {
            clientId_populationId: {
              clientId: client.id,
              populationId: randomPop.id
            }
          },
          update: {},
          create: {
            clientId: client.id,
            populationId: randomPop.id
          }
        })
      }
    }
  }
  
  console.log(`✅ Seeded ${clients.length} sample clients`)
}

if (require.main === module) {
  seedClients()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
}
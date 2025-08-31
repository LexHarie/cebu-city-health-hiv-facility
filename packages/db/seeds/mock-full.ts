import { PrismaClient, MedicationCategory, ResultStatus, SexAssignedAtBirth, ViralLoadStatus, TaskType, TaskStatus } from '@prisma/client'

const prisma = new PrismaClient()

function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }
function randBool(p = 0.5): boolean { return Math.random() < p }
function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); return d }
function daysFrom(n: number): Date { const d = new Date(); d.setDate(d.getDate() + n); return d }

async function cleanupSynthetic(clientId: string) {
  await prisma.task.deleteMany({ where: { clientId, payload: { equals: { synthetic: true } } } })
  await prisma.labPanel.deleteMany({ where: { clientId, labName: 'Synthetic' } })
  await prisma.prescription.deleteMany({ where: { clientId, instructions: 'Synthetic' } })
  await prisma.encounter.deleteMany({ where: { clientId, note: 'Synthetic' } })
  await prisma.sTIHistory.deleteMany({ where: { clientId, note: 'Synthetic' } })
  await prisma.sTIScreening.deleteMany({ where: { clientId, note: 'Synthetic' } })
  await prisma.transferEvent.deleteMany({ where: { clientId, note: 'Synthetic' } })
}

async function ensureLookups() {
  // Load frequently used panel/test lookups
  const panels = await prisma.lookup.findMany({ where: { type: 'panel_type', code: { in: ['HIV_VIRAL_LOAD', 'CD4_COUNT', 'CBC'] } } })
  const tests = await prisma.lookup.findMany({ where: { type: 'test_type', code: { in: ['VL_COPIES', 'CD4_COUNT', 'WBC', 'HEMOGLOBIN'] } } })
  const diseases = await prisma.lookup.findMany({ where: { type: 'disease', code: { in: ['SYPHILIS'] } } })
  const roles = await prisma.role.findMany({ where: { name: { in: ['CASE_MANAGER', 'NURSE'] } } })
  return { panels, tests, diseases, roles }
}

async function seedForClient(clientId: string) {
  await cleanupSynthetic(clientId)
  const { panels, tests, diseases, roles } = await ensureLookups()

  const panelVL = panels.find(p => p.code === 'HIV_VIRAL_LOAD')
  const panelCD4 = panels.find(p => p.code === 'CD4_COUNT')
  const testVL = tests.find(t => t.code === 'VL_COPIES')
  const testCD4 = tests.find(t => t.code === 'CD4_COUNT')
  const diseaseSyph = diseases.find(d => d.code === 'SYPHILIS')
  const roleCM = roles.find(r => r.name === 'CASE_MANAGER')

  // Encounters
  await prisma.encounter.createMany({
    data: [
      { clientId, date: daysAgo(randInt(120, 300)), type: 'INTAKE', note: 'Synthetic' },
      { clientId, date: daysAgo(randInt(30, 90)), type: 'FOLLOW_UP', note: 'Synthetic' },
      { clientId, date: daysAgo(randInt(5, 29)), type: 'COUNSELING', note: 'Synthetic' },
    ]
  })

  // Lab Panels + Results
  if (panelVL && testVL) {
    const reported = daysAgo(randInt(10, 60))
    const vlValue = randBool(0.7) ? randInt(0, 20) : randInt(50, 100000)
    await prisma.labPanel.create({
      data: {
        clientId,
        panelTypeId: panelVL.id,
        orderedAt: daysAgo(randInt(30, 90)),
        collectedAt: daysAgo(randInt(15, 30)),
        reportedAt: reported,
        labName: 'Synthetic',
        status: vlValue <= 20 ? ResultStatus.NEGATIVE : ResultStatus.POSITIVE,
        results: {
          create: [{ testTypeId: testVL.id, valueNum: vlValue, unit: 'copies/mL' }]
        }
      }
    })
    // Update clinical summary
    await prisma.clinicalSummary.upsert({
      where: { clientId },
      update: {
        firstViralLoadDate: reported,
        viralLoadStatus: vlValue <= 20 ? ViralLoadStatus.UNDETECTABLE : ViralLoadStatus.DETECTABLE,
      },
      create: { clientId, firstViralLoadDate: reported, viralLoadStatus: vlValue <= 20 ? ViralLoadStatus.UNDETECTABLE : ViralLoadStatus.DETECTABLE }
    })
  }
  if (panelCD4 && testCD4) {
    const cd4Date = daysAgo(randInt(60, 200))
    const cd4 = randInt(150, 800)
    await prisma.labPanel.create({
      data: {
        clientId,
        panelTypeId: panelCD4.id,
        orderedAt: cd4Date,
        collectedAt: cd4Date,
        reportedAt: cd4Date,
        labName: 'Synthetic',
        status: ResultStatus.PENDING,
        results: { create: [{ testTypeId: testCD4.id, valueNum: cd4, unit: 'cells/μL' }] }
      }
    })
    await prisma.clinicalSummary.upsert({
      where: { clientId },
      update: { baselineCd4: cd4, baselineCd4Date: cd4Date },
      create: { clientId, baselineCd4: cd4, baselineCd4Date: cd4Date }
    })
  }

  // Prescriptions (ARV or PREP) + TB prophylaxis sometimes
  const arvReg = await prisma.regimen.findFirst({ where: { category: MedicationCategory.ARV } })
  const prepReg = await prisma.regimen.findFirst({ where: { category: MedicationCategory.PREP } })
  const tbReg = await prisma.regimen.findFirst({ where: { category: MedicationCategory.TB_PROPHYLAXIS, name: { contains: '3HP' } } })
  if (arvReg || prepReg) {
    const useARV = randBool(0.7)
    await prisma.prescription.create({
      data: {
        clientId,
        category: useARV ? MedicationCategory.ARV : MedicationCategory.PREP,
        regimenId: (useARV ? arvReg?.id : prepReg?.id) || null,
        startDate: daysAgo(randInt(120, 360)),
        endDate: null,
        isActive: true,
        instructions: 'Synthetic'
      }
    })
  }
  if (tbReg && randBool(0.4)) {
    await prisma.prescription.create({
      data: {
        clientId,
        category: MedicationCategory.TB_PROPHYLAXIS,
        regimenId: tbReg.id,
        startDate: daysAgo(randInt(60, 200)),
        endDate: daysFrom(randInt(30, 90)),
        isActive: true,
        instructions: 'Synthetic'
      }
    })
  }

  // STI Screening + History
  if (diseaseSyph) {
    await prisma.sTIScreening.create({
      data: {
        clientId,
        diseaseId: diseaseSyph.id,
        screeningDate: daysAgo(randInt(30, 200)),
        result: randBool() ? ResultStatus.NEGATIVE : ResultStatus.POSITIVE,
        note: 'Synthetic'
      }
    })
    await prisma.sTIHistory.upsert({
      where: { clientId_diseaseId: { clientId, diseaseId: diseaseSyph.id } },
      update: { hadHistory: randBool(0.3), note: 'Synthetic' },
      create: { clientId, diseaseId: diseaseSyph.id, hadHistory: randBool(0.3), note: 'Synthetic' }
    })
  }

  // Transfers occasionally
  if (randBool(0.2)) {
    const facs = await prisma.facility.findMany({ take: 2 })
    if (facs.length >= 2) {
      const from = facs[0]
      const to = facs[1]
      if (from && to) {
        await prisma.transferEvent.create({
          data: {
            clientId,
            fromFacilityId: from.id,
            toFacilityId: to.id,
            transferDate: daysAgo(randInt(200, 400)),
            note: 'Synthetic'
          }
        })
      }
    }
  }

  // Tasks (Priority / TODOs)
  const assignedRoleId = roleCM?.id
  const taskData = [
    { type: TaskType.VL_MONITOR, title: 'Viral load monitoring due', dueDate: daysFrom(-randInt(1, 7)) },
    { type: TaskType.REFILL_ARV, title: 'ARV refill required', dueDate: daysFrom(randInt(0, 2)) },
    { type: TaskType.STI_SCREENING, title: 'STI screening follow-up', dueDate: daysFrom(randInt(3, 10)) },
  ]
  for (const t of taskData) {
    await prisma.task.create({
      data: {
        clientId,
        type: t.type,
        title: t.title,
        dueDate: t.dueDate,
        status: TaskStatus.OPEN,
        assignedToRoleId: assignedRoleId || null,
        payload: { synthetic: true }
      }
    })
  }

  // Notes field
  await prisma.client.update({ where: { id: clientId }, data: { notes: 'Synthetic notes' } })
}

async function main() {
  console.log('🔧 Seeding comprehensive synthetic data for all clients...')
  const clients = await prisma.client.findMany({ select: { id: true } })
  for (const c of clients) {
    await seedForClient(c.id)
  }
  console.log(`✅ Synthetic data seeded for ${clients.length} clients.`)
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })

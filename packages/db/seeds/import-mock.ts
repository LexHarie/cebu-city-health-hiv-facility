import { PrismaClient, LifecycleStatus, SexAssignedAtBirth, MedicationCategory, ResultStatus } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

type ClientInfoRow = Record<string, string>
type STIRow = Record<string, string>
type ThreeHPRow = Record<string, string>

const DATA_DIR = resolveDataDir()

function resolveDataDir(): string {
  const candidates = [
    path.resolve(process.cwd(), '../../csv-mock-up-data'),
    path.resolve(process.cwd(), '../csv-mock-up-data'),
    path.resolve(process.cwd(), 'csv-mock-up-data'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  throw new Error('csv-mock-up-data directory not found')
}

// Map external facility codes to existing facilities
const FACILITY_MAP: Record<string, string> = {
  // SHC typically refers to Social Hygiene Clinic at CCHD
  SHC: 'CCHD',
  TLY: 'CCHD',
  CHH: 'CCHD',
  L2C: 'CCHD',
  CP: 'CCHD',
  BJMP: 'CCHD',
}

// Suffix mapping by initial
const SUFFIX_MAP: Record<string, string> = {
  J: 'Jr.',
  S: 'Sr.',
}

// Simple Filipino-flavored name pools per initial (fallback to generic)
const FIRST_NAMES: Record<string, string[]> = {
  A: ['Alvin', 'Arnel', 'Adrian'],
  B: ['Benjamin', 'Bryan', 'Bonifacio'],
  C: ['Carlo', 'Christian', 'Cesar'],
  D: ['Daniel', 'Diego', 'Dennis'],
  E: ['Erwin', 'Edgar', 'Emmanuel'],
  F: ['Francis', 'Felix', 'Ferdinand'],
  G: ['Gerald', 'Gilbert', 'Glen'],
  H: ['Harold', 'Henry', 'Hector'],
  I: ['Ian', 'Ignacio'],
  J: ['Juan', 'Joseph', 'Jasper'],
  K: ['Kevin', 'Karl'],
  L: ['Leo', 'Luis', 'Lester'],
  M: ['Michael', 'Miguel', 'Martin'],
  N: ['Noel', 'Nathan'],
  O: ['Oscar', 'Oliver'],
  P: ['Paolo', 'Patrick', 'Peter'],
  Q: ['Quincy'],
  R: ['Ruel', 'Ramon', 'Ricardo'],
  S: ['Sherwin', 'Samuel', 'Sergio'],
  T: ['Tomas', 'Troy'],
  U: ['Ulysses'],
  V: ['Victor', 'Vincent'],
  W: ['William', 'Warren'],
  X: ['Xavier'],
  Y: ['Yuri'],
  Z: ['Zandro', 'Zachary']
}
const MIDDLE_NAMES: Record<string, string[]> = {
  A: ['Abella', 'Abad'], B: ['Bautista', 'Basa'], C: ['Cruz', 'Castro'], D: ['Dela Cruz', 'Diaz'],
  E: ['Enriquez'], F: ['Fernandez'], G: ['Garcia'], H: ['Hernandez'], I: ['Ignacio'], J: ['Jimenez'],
  K: ['Katigbak'], L: ['Lopez', 'Luna'], M: ['Morales', 'Mendoza'], N: ['Navarro'], O: ['Ocampo'],
  P: ['Perez'], Q: ['Quinto'], R: ['Ruedas', 'Reyes'], S: ['Santos', 'Saldua'], T: ['Torres'],
  U: ['Uy'], V: ['Villanueva'], W: ['Wenceslao'], X: ['Xavier'], Y: ['Yap'], Z: ['Zamora']
}
const SURNAMES: Record<string, string[]> = {
  A: ['Agbayani', 'Alvarez'], B: ['Bernardo', 'Bautista'], C: ['Cabrera', 'Castillo'], D: ['Domingo', 'Delos Reyes'],
  E: ['Espinosa'], F: ['Fajardo'], G: ['Gonzales', 'Gomez'], H: ['Hidalgo'], I: ['Ilagan'], J: ['Javier'],
  K: ['Katipunan'], L: ['Lopez', 'Lacson'], M: ['Morales', 'Macias'], N: ['Navarro'], O: ['Ortega'],
  P: ['Perez', 'Pascual'], Q: ['Quintos'], R: ['Reyes', 'Ramos', 'Ruedas'], S: ['Saldua', 'Santos'],
  T: ['Tibay', 'Torres'], U: ['Uy'], V: ['Valdez', 'Velasco'], W: ['Wagan'], X: ['Xerez'], Y: ['Yambao'], Z: ['Zabala']
}

function pickFromPool(letter: string | undefined, pool: Record<string, string[]>, fallback?: string): string {
  const key = (letter ?? '').toUpperCase()
  const arr = pool[key]
  if (Array.isArray(arr) && arr.length > 0) {
    return arr[0] ?? (fallback ?? '')
  }
  return fallback ?? ''
}

function deriveNamesFromClientCode(code: string): { first: string; middle?: string; surname: string; suffix?: string } {
  const prefix = (code || '').split('-')[0] || ''
  const letters = prefix.replace(/[^A-Za-z]/g, '').toUpperCase()
  const l = letters.length
  if (l === 0) {
    return { first: 'Unknown', surname: 'Unknown' }
  }
  const firstInit = letters[0]
  const middleInit = l >= 2 ? letters[1] : undefined
  const maybeSurnameInit = l >= 3 ? letters[2] : (l >= 2 ? letters[1] : firstInit)
  const maybeSuffixInit = l >= 4 ? letters[3] : undefined
  const suffix = maybeSuffixInit && SUFFIX_MAP[maybeSuffixInit] ? SUFFIX_MAP[maybeSuffixInit] : undefined

  const first = pickFromPool(firstInit, FIRST_NAMES, 'Alex')
  const middleVal = middleInit ? pickFromPool(middleInit, MIDDLE_NAMES) : ''
  const middle = middleVal || undefined
  const surname = pickFromPool(maybeSurnameInit, SURNAMES, 'Reyes')
  return { first, middle, surname, suffix }
}

function parseDate(input?: string): Date | null {
  if (!input) return null
  const s = input.trim()
  if (!s) return null
  // Normalize dd/mm/yyyy or mm/dd/yyyy
  const parts = s.split(/[/-]/)
  if (parts.length === 3) {
    const [p1raw, p2raw, p3raw] = parts as [string, string, string]
    const p1 = p1raw.replace(/[^0-9]/g, '')
    const p2 = p2raw.replace(/[^0-9]/g, '')
    const p3 = p3raw.replace(/[^0-9]/g, '')
    const mm = Number(p1)
    const dd = Number(p2)
    const yyyy = Number(p3.length === 2 ? (Number(p3) + 2000) : p3)
    if (!isNaN(mm) && !isNaN(dd) && !isNaN(yyyy)) {
      const d = new Date(yyyy, mm - 1, dd)
      return isNaN(d.getTime()) ? null : d
    }
  }
  const dt = new Date(s)
  return isNaN(dt.getTime()) ? null : dt
}

function toSex(val?: string): SexAssignedAtBirth | null {
  const v = (val || '').toLowerCase()
  if (v.startsWith('m')) return SexAssignedAtBirth.MALE
  if (v.startsWith('f')) return SexAssignedAtBirth.FEMALE
  return null
}

function toResultStatus(val?: string): ResultStatus | null {
  const v = (val || '').toLowerCase().trim()
  if (!v) return null
  if (v.includes('react') || v.includes('pos')) return ResultStatus.POSITIVE
  if (v.includes('non') || v.includes('neg')) return ResultStatus.NEGATIVE
  if (v.includes('pend')) return ResultStatus.PENDING
  return null
}

async function getFacilityIdByExternalCode(ext?: string): Promise<string> {
  const mapped = FACILITY_MAP[(ext || '').toUpperCase()] || 'CCHD'
  const f = await prisma.facility.findFirst({ where: { code: mapped } })
  if (!f) throw new Error(`Facility not found for code ${mapped}`)
  return f.id
}

async function upsertClient(row: ClientInfoRow): Promise<void> {
  const code = (row['Client Code'] || '').trim()
  if (!code) return
  const uicRaw = (row['UIC'] || '').trim()
  const uic = uicRaw || `${code.replace(/[^A-Za-z0-9]/g, '')}-${Date.now()}`
  const facilityExt = (row['Facility\nStarted Treatment'] || row['Facility Started Treatment'] || row['Facility'] || '').trim()
  const facilityId = await getFacilityIdByExternalCode(facilityExt)
  const dateEnrolled = parseDate(row['Date Enrolled MM/DD/YYYY']) || new Date()
  const dob = parseDate(row['Date Of Birth\nMM/DD/YYYY'])
  const sex = toSex(row['Sex At Birth']) || SexAssignedAtBirth.UNKNOWN
  const statusRaw = (row['STATUS UPDATES'] || '').toUpperCase()
  const status: LifecycleStatus = statusRaw.includes('TRANS-OUT') ? LifecycleStatus.TRANSFERRED_OUT
    : statusRaw.includes('EXPIRED') ? LifecycleStatus.EXPIRED
    : statusRaw.includes('INACTIVE') ? LifecycleStatus.INACTIVE
    : LifecycleStatus.ACTIVE

  let legalSurname = (row['Legal Surname'] || '').trim()
  let legalFirst = (row['Legal First Name'] || '').trim()
  let legalMiddle = (row['Legal Middle Name'] || '').trim() || undefined
  let suffix = (row['Suffix'] || '').trim() || undefined
  const preferredName = (row['Preferred Name'] || '').trim() || undefined
  const counselor = (row['Life Coach / Counselor'] || row['Life Coach'] || '').trim()
  const genderIdentityLabel = (row['Gender Identity'] || '').trim()

  if (!legalSurname || !legalFirst) {
    const gen = deriveNamesFromClientCode(code)
    legalFirst = legalFirst || gen.first
    legalMiddle = legalMiddle || gen.middle
    legalSurname = legalSurname || gen.surname
    suffix = suffix || gen.suffix
  }

  // Optionally create/assign a case manager user from counselor name
  let caseManagerId: string | undefined
  if (counselor) {
    const slug = counselor.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const email = `counselor+${slug}@local.test`
    const cm = await prisma.user.upsert({
      where: { email },
      update: { displayName: counselor, facilityId },
      create: { email, displayName: counselor, facilityId }
    })
    const cmRole = await prisma.role.findFirst({ where: { name: 'CASE_MANAGER' } })
    if (cmRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: cm.id, roleId: cmRole.id } },
        update: {},
        create: { userId: cm.id, roleId: cmRole.id }
      })
    }
    caseManagerId = cm.id
  }

  // Optionally upsert gender identity lookup
  let genderIdentityId: string | undefined
  if (genderIdentityLabel) {
    const code = genderIdentityLabel.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
    const gi = await prisma.lookup.upsert({
      where: { type_code: { type: 'gender_identity', code } },
      update: { label: genderIdentityLabel },
      create: { type: 'gender_identity', code, label: genderIdentityLabel }
    })
    genderIdentityId = gi.id
  }

  const client = await prisma.client.upsert({
    where: { uic },
    update: {
      facilityId,
      currentFacilityId: facilityId,
      dateEnrolled,
      clientCode: code,
      philHealth: (row['Philhealth #'] || '').trim() || null,
      legalSurname,
      legalFirst,
      legalMiddle: legalMiddle || null,
      suffix: suffix || null,
      preferredName: preferredName || null,
      dateOfBirth: dob,
      sexAtBirth: sex,
      genderIdentityId: genderIdentityId || null,
      homeAddress: (row['Home Address'] || '').trim() || null,
      workAddress: (row['Work\nAddress'] || row['Work Address'] || '').trim() || null,
      occupation: (row['Occupation'] || '').trim() || null,
      contactNumber: (row['Contact #'] || '').trim() || null,
      email: (row['Email\nAddress'] || row['Email Address'] || '').trim() || null,
      caseManagerId: caseManagerId || null,
      notes: (row['Notes'] || '').trim() || null,
      status,
    },
    create: {
      facilityId,
      currentFacilityId: facilityId,
      dateEnrolled,
      clientCode: code,
      uic,
      philHealth: (row['Philhealth #'] || '').trim() || null,
      legalSurname,
      legalFirst,
      legalMiddle: legalMiddle || null,
      suffix: suffix || null,
      preferredName: preferredName || null,
      dateOfBirth: dob,
      sexAtBirth: sex,
      genderIdentityId: genderIdentityId || null,
      homeAddress: (row['Home Address'] || '').trim() || null,
      workAddress: (row['Work\nAddress'] || row['Work Address'] || '').trim() || null,
      occupation: (row['Occupation'] || '').trim() || null,
      contactNumber: (row['Contact #'] || '').trim() || null,
      email: (row['Email\nAddress'] || row['Email Address'] || '').trim() || null,
      caseManagerId: caseManagerId || null,
      notes: (row['Notes'] || '').trim() || null,
      status,
    }
  })

  // Ensure clinical summary exists
  await prisma.clinicalSummary.upsert({
    where: { clientId: client.id },
    update: {},
    create: { clientId: client.id }
  })

  // Optional population mapping: mark MSM for male clients with Gay/Bisexual identity
  if (sex === SexAssignedAtBirth.MALE && genderIdentityLabel) {
    const pop = await prisma.lookup.findFirst({ where: { type: 'population', code: 'MSM' } })
    if (pop) {
      await prisma.clientPopulationMap.upsert({
        where: { clientId_populationId: { clientId: client.id, populationId: pop.id } },
        update: {},
        create: { clientId: client.id, populationId: pop.id }
      })
    }
  }
}

async function importClientInformation(): Promise<void> {
  const file = path.join(DATA_DIR, 'MOCK UP - Client Information.csv')
  const buf = fs.readFileSync(file)
  const records: ClientInfoRow[] = parse(buf, { columns: true, skip_empty_lines: true })
  for (const row of records) {
    try { await upsertClient(row) } catch (e) { /* log minimal */ }
  }
}

async function importSTIMonitoring(): Promise<void> {
  const file = path.join(DATA_DIR, 'MOCK UP - STI MONITORING.csv')
  if (!fs.existsSync(file)) return
  const buf = fs.readFileSync(file)
  const rows: STIRow[] = parse(buf, { columns: true, skip_empty_lines: true })

  const syph = await prisma.lookup.findFirst({ where: { type: 'disease', code: 'SYPHILIS', active: true } })
  for (const row of rows) {
    const code = (row['Client Code'] || '').trim()
    const uic = (row['UIC'] || '').trim()
    const client = uic ? await prisma.client.findFirst({ where: { uic } })
      : await prisma.client.findFirst({ where: { clientCode: code } })
    if (!client) continue
    
    const screeningDate = parseDate(row['Date Syp Tested MM/DD/YYYY'] || row['Date Performed'])
    const result = toResultStatus(row['Results']) || ResultStatus.PENDING
    if (screeningDate && syph) {
      await prisma.sTIScreening.create({
        data: {
          clientId: client.id,
          diseaseId: syph.id,
          screeningDate,
          result,
          testName: 'RPR',
          note: undefined,
        }
      })
    }
  }
}

async function import3HP(): Promise<void> {
  const file = path.join(DATA_DIR, 'MOCK UP - Monitoring & 3HP.csv')
  if (!fs.existsSync(file)) return
  const buf = fs.readFileSync(file)
  const rows: ThreeHPRow[] = parse(buf, { columns: true, skip_empty_lines: true })
  const regimen = await prisma.regimen.findFirst({ where: { category: MedicationCategory.TB_PROPHYLAXIS, name: { contains: '3HP' } } })
  for (const row of rows) {
    const code = (row['CLIENT CODE'] || row['Client Code'] || '').trim()
    const uic = (row['UIC'] || '').trim()
    const flag = (row['3HP'] || '').trim().toUpperCase()
    if (!flag || !flag.startsWith('Y')) continue
    const client = uic ? await prisma.client.findFirst({ where: { uic } })
      : await prisma.client.findFirst({ where: { clientCode: code } })
    if (!client) continue

    const start = parseDate(row['STARTED']) || parseDate(row['Date Started']) || parseDate(row['START MONITORED']) || parseDate(row['DATE ENROLLED'])
    const end = parseDate(row['ENDED'])
    if (!start) continue

    await prisma.prescription.create({
      data: {
        clientId: client.id,
        category: MedicationCategory.TB_PROPHYLAXIS,
        regimenId: regimen?.id || null,
        startDate: start,
        endDate: end,
        instructions: '3HP per monitoring sheet',
        prescriberId: null,
      }
    })
  }
}

async function main() {
  console.log('📥 Importing mock CSV data...')
  await importClientInformation()
  await importSTIMonitoring()
  await import3HP()
  console.log('✅ Import complete.')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })

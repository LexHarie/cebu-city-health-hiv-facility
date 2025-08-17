I. Design goals (non‑negotiable)

Integrity: every clinical datum is time‑stamped, source‑referenced, and immutable (no overwrites; use append + status).

Fast search: sub‑100 ms prefix/fuzzy search on name, UIC, client code, phone.

Separation of concerns: demographics vs. clinical vs. pharmacy vs. ops data separated for authorization and auditing.

Traceability: complete AuditLog of reads/writes and auth events.

Role‑based access: physician (super admin), nurse, case manager, encoder. Least privilege enforced per entity/action.

Compute, don’t duplicate: ages, “current ARV”, LTFU, “missing labs”, next follow‑up are computed or materialized.

Multi‑facility: first‑class Facility with transfer events.

Deployable stack: PostgreSQL + Prisma on a Next.js monorepo (App Router), Vercel Cron for scheduled jobs.

II. High‑level ERD (core entities only)
Facility 1─* Client *─1 CaseManager(User)
Facility 1─* User  *─* Role via UserRole

Client 1─* Encounter 1─? Attachment
Client 1─* TransferEvent
Client 1─1 ClinicalSummary (denormalized accelerators)

Client 1─* LabPanel 1─* LabResult   (LabPanelType, LabTestType dictionaries)
Client 1─* STIScreening (→ Disease)
Client 1─* STIHistory   (→ Disease)

Client 1─* Prescription (→ Regimen or Medication) 1─* Dispense

Client 1─* Task (reminders/next steps)

User 1─* AuditLog
Auth: User 1─* Session; User 1─* OtpCode
Client *─* ClientPopulation (dictionary) via ClientPopulationMap

III. Prisma schema (production‑ready, trimmed to essentials)

Conventions: database tables are snake_case via @@map, fields mapped via @map. Add more fields as needed; the skeleton below covers everything you listed and keeps extensibility.

// schema.prisma
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

/*** ENUMS ***/
enum LifecycleStatus { ACTIVE TRANSFERRED_OUT EXPIRED LOST_TO_FOLLOW_UP INACTIVE }
enum SexAssignedAtBirth { MALE FEMALE INTERSEX UNKNOWN }
enum ResultStatus { POSITIVE NEGATIVE INDETERMINATE PENDING NOT_DONE }
enum ViralLoadStatus { UNDETECTABLE SUPPRESSED DETECTABLE HIGH_NOT_SUPPRESSED PENDING NOT_DONE }
enum TaskType { FOLLOW_UP REFILL_PREP REFILL_ARV LABS_PENDING VL_MONITOR STI_SCREENING LTFU_REVIEW ADMIN }
enum TaskStatus { OPEN DONE DISMISSED }
enum MedicationCategory { ARV PREP TB_PROPHYLAXIS STI OTHER }
enum OtpType { EMAIL SMS TOTP }

/*** RBAC ***/
model Facility {
  id        String   @id @default(uuid())
  name      String
  code      String   @unique
  address   String?
  clients   Client[]
  users     User[]
  createdAt DateTime @default(now())
  @@map("facilities")
}

model Role {
  id    String @id @default(uuid())
  name  String @unique // "PHYSICIAN","NURSE","CASE_MANAGER","ENCODER","ADMIN"
  users UserRole[]
  @@map("roles")
}
model User {
  id          String      @id @default(uuid())
  email       String      @unique
  phone       String?     @db.VarChar(32)
  displayName String?
  facilityId  String?
  facility    Facility?   @relation(fields: [facilityId], references: [id])
  roles       UserRole[]
  sessions    Session[]
  caseClients Client[]    @relation("CaseManagerToClient")
  auditLogs   AuditLog[]
  createdAt   DateTime    @default(now())
  @@map("users")
}
model UserRole {
  userId String
  roleId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  @@id([userId, roleId])
  @@map("user_roles")
}

/*** CLIENT CORE ***/
model Client {
  id            String   @id @default(uuid())
  facilityId    String
  facility      Facility @relation(fields: [facilityId], references: [id])
  dateEnrolled  DateTime @map("date_enrolled")

  clientCode    String   @map("client_code") // unique per facility
  uic           String   @unique            // Unique Identifier Code
  philHealth    String?  @map("philhealth_number")

  legalSurname  String   @map("legal_surname")
  legalFirst    String   @map("legal_first_name")
  legalMiddle   String?  @map("legal_middle_name")
  suffix        String?
  preferredName String?  @map("preferred_name")

  dateOfBirth   DateTime? @map("date_of_birth")
  sexAtBirth    SexAssignedAtBirth @map("sex_assigned_at_birth")
  genderIdentityId String? // dictionary row id
  genderIdentity   Lookup? @relation("gender_identity", fields: [genderIdentityId], references: [id])

  homeAddress   String?  @map("home_address")
  workAddress   String?  @map("work_address")
  occupation    String?

  contactNumber String?  @map("contact_number")
  email         String?  @map("email_address")

  caseManagerId String?  @map("case_manager_id")
  caseManager   User?    @relation("CaseManagerToClient", fields: [caseManagerId], references: [id])

  notes         String?

  // lifecycle
  currentFacilityId String  @map("current_facility_id")
  currentFacility   Facility @relation("current_facility", fields: [currentFacilityId], references: [id])
  status        LifecycleStatus @default(ACTIVE)
  expirationDate DateTime?  @map("expiration_date")

  // denormalized accelerators (computed by jobs/triggers)
  lastVisitAt   DateTime? @map("last_visit_at")

  clinicalSummary ClinicalSummary?
  encounters    Encounter[]
  transfers     TransferEvent[]
  populations   ClientPopulationMap[]
  labPanels     LabPanel[]
  stiHistory    STIHistory[]
  stiScreenings STIScreening[]
  prescriptions Prescription[]
  tasks         Task[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([facilityId, clientCode])
  @@index([dateEnrolled])
  @@index([legalSurname, legalFirst])
  @@map("clients")
}

model ClinicalSummary {
  clientId        String @id @map("client_id")
  client          Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  baselineCd4     Int?    @map("baseline_cd4")
  baselineCd4Date DateTime? @map("baseline_cd4_date")

  firstViralLoadDate DateTime? @map("first_viral_load_date")
  viralLoadStatus     ViralLoadStatus? @map("viral_load_status")

  currentArvRegimenId String?  @map("current_arv_regimen_id")
  currentArvRegimen   Regimen? @relation(fields: [currentArvRegimenId], references: [id])

  currentPrepRegimenId String? @map("current_prep_regimen_id")
  currentPrepRegimen   Regimen? @relation("current_prep", fields: [currentPrepRegimenId], references: [id])

  updatedAt DateTime @updatedAt
  @@map("clinical_summaries")
}

model TransferEvent {
  id          String   @id @default(uuid())
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  fromFacilityId String? @map("from_facility_id")
  toFacilityId   String? @map("to_facility_id")
  fromFacility   Facility? @relation("transfer_from", fields: [fromFacilityId], references: [id])
  toFacility     Facility? @relation("transfer_to", fields: [toFacilityId], references: [id])
  transferDate DateTime @map("transfer_date")
  note         String?
  @@index([clientId, transferDate])
  @@map("transfer_events")
}

/*** LOOKUPS / CATEGORIES ***/
model Lookup {
  id      String @id @default(uuid())
  type    String // "GENDER_IDENTITY","DISEASE","LAB_PANEL","LAB_TEST","POPULATION","REGIMEN","MEDICATION"
  code    String
  label   String
  extra   Json?
  active  Boolean @default(true)
  @@unique([type, code])
  @@map("lookups")
}

model ClientPopulationMap {
  clientId String
  client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  populationId String
  population   Lookup @relation(fields: [populationId], references: [id])
  @@id([clientId, populationId])
  @@map("client_population_map")
}

/*** ENCOUNTERS ***/
model Encounter {
  id        String   @id @default(uuid())
  clientId  String
  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  clinicianId String? // User.id
  clinician User? @relation(fields: [clinicianId], references: [id])
  date      DateTime
  type      String   // "INTAKE","FOLLOW_UP","COUNSELING","DISPENSE","LAB_COLLECTION"
  note      String?
  createdAt DateTime @default(now())
  @@index([clientId, date])
  @@map("encounters")
}

/*** LABS ***/
model LabPanel {
  id          String   @id @default(uuid())
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  encounterId String?
  encounter   Encounter? @relation(fields: [encounterId], references: [id])

  panelTypeId String   @map("panel_type_id") // → Lookup(type="LAB_PANEL")
  panelType   Lookup   @relation("panel_type", fields: [panelTypeId], references: [id])
  orderedAt   DateTime?
  collectedAt DateTime?
  reportedAt  DateTime?
  labName     String?
  status      ResultStatus @default(PENDING)
  results     LabResult[]

  @@index([clientId, reportedAt])
  @@map("lab_panels")
}

model LabResult {
  id        String @id @default(uuid())
  panelId   String
  panel     LabPanel @relation(fields: [panelId], references: [id], onDelete: Cascade)

  testTypeId String  @map("test_type_id") // → Lookup(type="LAB_TEST")
  testType   Lookup  @relation("test_type", fields: [testTypeId], references: [id])

  valueNum   Float?
  valueText  String?
  unit       String?
  refLow     Float?
  refHigh    Float?
  abnormal   Boolean?
  @@index([panelId])
  @@map("lab_results")
}

/*** STIs ***/
model STIHistory {
  id          String @id @default(uuid())
  clientId    String
  client      Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  diseaseId   String  // → Lookup(type="DISEASE")
  disease     Lookup  @relation("disease_hist", fields: [diseaseId], references: [id])

  hadHistory  Boolean
  recordedAt  DateTime @default(now())
  note        String?
  @@unique([clientId, diseaseId]) // enrollment snapshot
  @@map("sti_history")
}

model STIScreening {
  id          String @id @default(uuid())
  clientId    String
  client      Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  diseaseId   String  // → Lookup(type="DISEASE")
  disease     Lookup  @relation("disease_screen", fields: [diseaseId], references: [id])

  screeningDate DateTime
  result        ResultStatus
  labPanelId    String?
  labPanel      LabPanel? @relation(fields: [labPanelId], references: [id])
  testName      String?
  note          String?
  @@index([clientId, screeningDate])
  @@map("sti_screenings")
}

/*** PHARMACY ***/
model Medication {
  id        String @id @default(uuid())
  name      String
  category  MedicationCategory
  code      String? // e.g., "TDF/3TC/DTG" for components
  extra     Json?
  active    Boolean @default(true)
  @@unique([name, category])
  @@map("medications")
}
model Regimen {
  id        String @id @default(uuid())
  name      String // e.g., "TLD", "3HP", "PrEP-TDF/FTC"
  category  MedicationCategory
  active    Boolean @default(true)
  items     RegimenItem[]
  @@unique([name, category])
  @@map("regimens")
}
model RegimenItem {
  regimenId   String
  regimen     Regimen @relation(fields: [regimenId], references: [id], onDelete: Cascade)
  medicationId String
  medication   Medication @relation(fields: [medicationId], references: [id])
  qtyPerDose   Float?
  unit         String?
  @@id([regimenId, medicationId])
  @@map("regimen_items")
}

model Prescription {
  id          String @id @default(uuid())
  clientId    String
  client      Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  regimenId   String?
  regimen     Regimen? @relation(fields: [regimenId], references: [id])

  medicationId String?
  medication   Medication? @relation(fields: [medicationId], references: [id])

  category    MedicationCategory
  startDate   DateTime
  endDate     DateTime?
  prescriberId String?
  prescriber   User? @relation(fields: [prescriberId], references: [id])

  instructions String?
  reasonChange String?

  dispenses   Dispense[]
  isActive    Boolean @default(true)
  @@index([clientId, category, isActive])
  @@map("prescriptions")
}

model Dispense {
  id             String   @id @default(uuid())
  prescriptionId String
  prescription   Prescription @relation(fields: [prescriptionId], references: [id], onDelete: Cascade)
  dispensedAt    DateTime
  daysSupply     Int?
  quantity       Float?
  unit           String?
  nextRefillDate DateTime?
  note           String?
  @@index([dispensedAt])
  @@map("dispenses")
}

/*** TASKS / REMINDERS ***/
model Task {
  id        String   @id @default(uuid())
  clientId  String
  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  type      TaskType
  title     String
  dueDate   DateTime?
  status    TaskStatus @default(OPEN)
  assignedToRoleId String?
  assignedToRole   Role? @relation(fields: [assignedToRoleId], references: [id])
  createdById String?
  createdBy   User? @relation(fields: [createdById], references: [id])
  payload   Json?
  createdAt DateTime @default(now())
  completedAt DateTime?
  @@index([clientId, type, status])
  @@map("tasks")
}

/*** AUDIT + AUTH ***/
model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  actorType String   // "USER" | "SYSTEM"
  action    String   // "LOGIN","READ","CREATE","UPDATE","DELETE","EXPORT"
  entity    String?  // table name
  entityId  String?
  before    Json?
  after     Json?
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())
  @@index([action, createdAt])
  @@map("audit_logs")
}
model Session {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  expiresAt DateTime
  ip        String?
  userAgent String?
  @@index([userId, expiresAt])
  @@map("sessions")
}
model OtpCode {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      OtpType
  // store only a hash
  codeHash  String
  sentTo    String // email or phone
  expiresAt DateTime
  consumedAt DateTime?
  attempts  Int     @default(0)
  createdAt DateTime @default(now())
  @@index([userId, type, expiresAt, consumedAt])
  @@map("otp_codes")
}


Notes

Lookup supplies extensible dictionaries for: gender identities, diseases (Hepatitis B, Hepatitis C, Syphilis, Tuberculosis, Pneumonia, Chlamydia, Gonorrhoea, etc.), key populations (MSM, TGW, PWID, PWUD, FSW, RSW, YKP, PDL, MSP), lab panels (CBC, Creatinine, SGPT/SGOT, Urinalysis, X-Ray, FBS, Lipid Panel, CD4, HIV Viral Load), lab test items, and additional regimens/meds as your formulary evolves. Avoids painful enum migrations.

IV. Search performance (sub‑100 ms)

Manual SQL migration (run once after Prisma migrate):

-- Extensions
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Normalized text search column
ALTER TABLE clients
ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', unaccent(coalesce(lower(legal_surname), ''))), 'A') ||
  setweight(to_tsvector('simple', unaccent(coalesce(lower(legal_first_name), ''))), 'A') ||
  setweight(to_tsvector('simple', unaccent(coalesce(lower(preferred_name), ''))), 'B') ||
  setweight(to_tsvector('simple', unaccent(coalesce(lower(client_code), ''))), 'A') ||
  setweight(to_tsvector('simple', unaccent(coalesce(lower(uic), ''))), 'A') ||
  setweight(to_tsvector('simple', unaccent(coalesce(lower(contact_number), ''))), 'C')
) STORED;

-- Indexes
CREATE INDEX clients_search_gin ON clients USING GIN (search_vector);
CREATE INDEX clients_surname_trgm ON clients USING GIN (legal_surname gin_trgm_ops);
CREATE INDEX clients_phone_trgm   ON clients USING GIN (contact_number gin_trgm_ops);
CREATE INDEX clients_dob_idx      ON clients (date_of_birth);
CREATE INDEX clients_status_idx   ON clients (status);


Query pattern (Prisma raw):

// example: fast multi-field search
const q = input.search.trim().toLowerCase();
await prisma.$queryRaw`
  SELECT id, client_code, uic, legal_surname, legal_first_name, preferred_name, date_of_birth
  FROM clients
  WHERE search_vector @@ plainto_tsquery('simple', ${q})
     OR legal_surname ILIKE ${q + '%'}
     OR client_code ILIKE ${q + '%'}
     OR uic ILIKE ${q + '%'}
  ORDER BY legal_surname, legal_first_name
  LIMIT 50;
`;

V. Clinical logic (compute, not store)

Ages

age_at_enrollment_years generated column:

ALTER TABLE clients
ADD COLUMN age_at_enrollment_years int
GENERATED ALWAYS AS (
  EXTRACT(year FROM age(date_enrolled, date_of_birth))::int
) STORED;


Current age: compute in query or view; don’t persist.

Baseline CD4 / First VL / VL status

Store raw labs in lab_* tables; populate clinical_summaries via triggers or nightly cron consolidating:

earliest CD4 result → baseline_cd4 + date

earliest HIV Viral Load result date → first_viral_load_date

latest VL numeric value → map to ViralLoadStatus buckets (rules in app/job), write to viral_load_status.

Lost to follow‑up (LTFU)

Rule (default): no encounter or dispense in 90 days ⇒ flag.

Materialize into tasks nightly; clear when a new encounter/dispense posts.

Missing labs

Define required panel set by regimen/category (e.g., ARV requires VL every 6 or 12 months per policy; PrEP requires Creatinine q6–12 months; CBC, LFT patterns as configured). A job scans last completed lab_panels and generates LABS_PENDING tasks with payload listing missing ones and due dates.

VI. Pharmacy modeling (ARV, PrEP, TB prophylaxis, STI meds)

Populate dictionaries:

Regimens: TLD (tenofovir/lamivudine/dolutegravir), 3HP (isoniazid/rifapentine), PrEP-TDF/FTC, plus local ARV lines.

Medication (STI) examples to preload (names only; dosing left to physician):
Ceftriaxone, Azithromycin, Doxycycline, Benzathine penicillin G, Metronidazole, Tinidazole, Ciprofloxacin (if policy), Acyclovir/Valacyclovir (HSV), Oseltamivir (if pneumonia etiology dictates), Isoniazid, Rifapentine, Rifampicin.

“Current ARV” = active Prescription.isActive=true with category=ARV and (endDate IS NULL OR endDate>now()). Mirror into clinical_summaries.current_arv_regimen_id for O(1) reads.

Refills: Dispense.nextRefillDate drives REFILL_ARV/REFILL_PREP tasks.

VII. STI/STD on enrollment and screening

At intake, write one row to sti_history per disease with had_history=true/false.

Every screen/test result is an sti_screenings row; if linked to a lab_panel, set lab_panel_id.

The latest positive per disease should generate an STI_SCREENING follow‑up task as your protocol requires.

VIII. Dashboard data (materialized views)

Use materialized views + scheduled refresh (Vercel Cron):

CREATE MATERIALIZED VIEW mv_enrollments_by_month AS
SELECT date_trunc('month', date_enrolled) AS month, count(*) AS total
FROM clients GROUP BY 1;

CREATE MATERIALIZED VIEW mv_status_counts AS
SELECT status, count(*) AS total FROM clients GROUP BY status;

CREATE MATERIALIZED VIEW mv_population_counts AS
SELECT l.label AS population, count(*) AS total
FROM client_population_map m
JOIN lookups l ON l.id = m.population_id
GROUP BY l.label;

-- refresh job nightly
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_enrollments_by_month;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_status_counts;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_population_counts;


Expose via /api/dashboard for cards + trends.

IX. AuthN/AuthZ (OTP, sessions, policies)

OTP options: email magic code/link, SMS code, or TOTP (authenticator app). Persist only code hashes (OtpCode.codeHash). Throttle attempts.

Sessions short‑lived, refresh by rotating token; persist IP/user‑agent in sessions.

Authorization policy (app‑level middleware):

Physician (super admin): full read/write.

Nurse: all clinical read/write; limited admin (no role/user management).

Case Manager: demographics, encounters, tasks; read meds/labs; write notes and tasks.

Encoder: create/update demographics, lab result entry; no delete; read‑only pharmacy unless allowed.

Audit every CREATE/UPDATE/DELETE. Log READ of sensitive entities (Client, LabPanel, Prescription) with coarse granularity to manage volume.

PII/PHI hardening

Enable pg_trgm, unaccent already. Add pgcrypto if you will encrypt at column level (e.g., PhilHealth, phone, email).

Mask PII in UI by default (partial phone/email) per role.

X. Transfers and facility consistency

Record all movements in transfer_events.

Keep clients.current_facility_id in sync via trigger or service logic at the moment of transfer.

For your legacy “Transfer In / Transfer Out + dates” columns, use read‑through views or derive from transfer_events to avoid double‑entry.

XI. What shows on the Client Profile (from this model)

Next follow‑up date → min(open tasks of type FOLLOW_UP, REFILL_*, VL_MONITOR, STI_SCREENING).

Missing labs → LABS_PENDING task payload.

LTFU flag → open LTFU_REVIEW task.

Last visit → clients.last_visit_at (updated from each new Encounter/Dispense).

STI status → latest positive/negative per disease from sti_screenings.

Current ARV/PrEP → from clinical_summaries.

XII. Example seed data (lookups you must preload)

POPULATION: MSM, TGW, PWID, PWUD, FSW, RSW, YKP (15–24), PDL, MSP.

LAB_PANEL: CBC, Creatinine, SGPT/SGOT, Urinalysis, X-Ray, FBS, Lipid Panel, CD4, HIV Viral Load, HepB, HepC, RPR/VDRL, GeneXpert TB.

LAB_TEST: granular items for each panel (Hgb, Hct, WBC…; VL copies/mL; CD4 cells/mm³).

DISEASE: Hepatitis B, Hepatitis C, Syphilis, Tuberculosis, Pneumonia, Chlamydia, Gonorrhoea, Trichomoniasis, HSV, HPV.

REGIMEN/MEDICATION: TLD, 3HP, PrEP‑TDF/FTC, and STI meds listed above.

XIII. Background jobs (Vercel Cron)

Nightly summarization: recompute clinical_summaries, clients.last_visit_at, refresh MVs.

Task generation: create/update LABS_PENDING, VL_MONITOR, REFILL_*, LTFU_REVIEW tasks.

OTP purge: delete expired codes; revoke stale sessions.

Audit compaction: move old read‑logs to cold storage if needed.

XIV. API surface (minimal, versioned)

GET /api/clients?search=&status=&facility= → indexed search.

GET /api/clients/:id → profile (joins summary, open tasks).

POST /api/clients / PATCH /api/clients/:id → demographics.

POST /api/encounters / POST /api/labs/panels / POST /api/labs/results

POST /api/prescriptions / POST /api/dispenses

GET /api/tasks?clientId= / PATCH /api/tasks/:id

GET /api/dashboard

Auth: POST /api/auth/otp/request (email/phone), POST /api/auth/otp/verify, POST /api/auth/logout.

XV. Security defaults

Disable Prisma findMany without where‑clauses for sensitive tables.

Enforce facility scoping on every query.

Validate uploads; store attachments in object storage with signed URLs; never public.

Strict input validation (Zod) + server‑side rate limiting.

XVI. Two concrete manual SQL snippets you will want

(A) Keep clients.last_visit_at current

CREATE OR REPLACE FUNCTION update_last_visit_from_encounter()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE clients SET last_visit_at = GREATEST(coalesce(last_visit_at, 'epoch'), NEW.date)
  WHERE id = NEW.client_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_encounter_last_visit
AFTER INSERT ON encounters
FOR EACH ROW EXECUTE FUNCTION update_last_visit_from_encounter();

CREATE OR REPLACE FUNCTION update_last_visit_from_dispense()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE clients SET last_visit_at = GREATEST(coalesce(last_visit_at, 'epoch'), NEW.dispensed_at)
  WHERE id = NEW.client_id; -- if you add client_id to dispenses for convenience
  RETURN NEW;
END; $$;


(B) Compute VL status (example rule; tune as policy)

-- Example mapping using latest VL numeric from lab_results linked to "HIV Viral Load"
-- This is usually done in a job; shown as a SQL CTE for clarity.
WITH latest_vl AS (
  SELECT lp.client_id, lr.valueNum AS vl, lp.reported_at,
         row_number() OVER (PARTITION BY lp.client_id ORDER BY lp.reported_at DESC) AS rn
  FROM lab_panels lp
  JOIN lab_results lr ON lr.panel_id = lp.id
  JOIN lookups p ON p.id = lp.panel_type_id AND p.type='LAB_PANEL' AND p.code='HIV_VL'
)
UPDATE clinical_summaries cs
SET viral_load_status =
  CASE
    WHEN lv.vl IS NULL THEN 'PENDING'
    WHEN lv.vl < 50 THEN 'UNDETECTABLE'
    WHEN lv.vl < 1000 THEN 'SUPPRESSED'
    ELSE 'DETECTABLE'
  END::"ViralLoadStatus"
FROM latest_vl lv
WHERE cs.client_id = lv.client_id AND lv.rn = 1;
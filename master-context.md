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

XVII. UI/UX agent prompt (give this to your design agent)
You are designing the initial UI/UX for a secure, role-based HIV Prevention & Care web app. Stack: Next.js (App Router), Tailwind CSS, Radix UI primitives, TypeScript.

MANDATES:
1) Accessibility first (WCAG AA), keyboard-only operable, large tap targets, high contrast.
2) Speed: every core action ≤2 clicks/keystrokes from search.
3) Information hierarchy: Demographics → Clinical Summary → Tasks (Reminders) → Labs → Medications → Visits → STI.

THEME:
- Implement a theming system with CSS variables: --color-lucky-1, --color-lucky-2, --color-lucky-3, --color-accent-red.
- Default palette suggestion: lucky-1 (#D4AF37 / gold), lucky-2 (#2E7D32 / green), lucky-3 (#0D47A1 / deep blue); accent-red (#E10600).
- Include the red ribbon symbol (HIV/AIDS awareness) as a top-left small emblem and as an accent icon in sections related to ARV/PrEP and VL tasks.
- Provide a Light and Dark mode; ensure contrast remains AA+.

PAGES/COMPONENTS TO DELIVER (wireframes + component specs):
- Login (OTP entry with choice of email/SMS), Verification, Forgot Session.
- Dashboard: KPI cards (Enrolled, Alive, Expired, Under Monitoring, LTFU), trends (enrollments by month), population breakdown (bar/pie), task queue panel.
- Global search bar (sticky) with instant results (name, UIC, client code, DoB) and keyboard navigation.
- Client Profile layout:
  • Header: Name, UIC, client code, status badge, red ribbon if ARV/PrEP active.
  • Quick facts: age, DoB, sex at birth, gender identity, populations, case manager, last visit.
  • Reminders/Next Steps: task list with due dates and colored urgency bars.
  • Clinical Summary: baseline CD4, first VL date, current VL status chip, current ARV/PrEP regimen.
  • Tabs: Labs (panels/results), Medications (regimens, dispenses, refill dates), Encounters, STI (history + latest screening), Transfers, Notes.
- Data entry wizards:
  • New Client (minimal required), Lab Panel + Results, New Prescription + Dispense, STI Screening.
- Table patterns: dense, virtualized lists, column filters, export button (role-gated).
- Empty states and loading skeletons for every major component.

MICROINTERACTIONS:
- Overdue tasks pulse subtly.
- Copy-to-clipboard for UIC/client code.
- Badge color system: ACTIVE (lucky-2), EXPIRED (gray), TRANSFERRED_OUT (blue), LTFU (amber).

OUTPUT:
- Provide high-fidelity Figma frames with component specifications and tokens for the theme variables.
- Export a Tailwind config excerpt with theme tokens mapped to CSS variables.
- Provide an iconography set including the red ribbon in SVG.

XVIII. Coding agent prompt (TODO plan to start building)
You are the coding agent for a Next.js monorepo (frontend + API) with Prisma + PostgreSQL and Vercel deploys. Deliver working code, migrations, seeds, and tests.

TECH BASELINE
- Next.js (App Router), TypeScript, Tailwind, Radix UI.
- Prisma with PostgreSQL, drizzle-style migrations via Prisma Migrate.
- Auth: OTP-only (email or SMS), sessions in DB. Do not store plain OTP. Rate-limit endpoints.
- Background jobs: Vercel Cron hitting /api/jobs/* routes with HMAC.

REPO STRUCTURE
- apps/web (Next.js app)
- packages/db (Prisma schema + client)
- packages/ui (shared components)
- packages/config (eslint, tsconfig, tailwind)
- packages/lib (auth, rbac, zod schemas)

TODO LIST (execute in order)

[DB & MODELS]
1. Implement Prisma models exactly as specified (schema.prisma from the brief). Add @@map and @map for snake_case. Run `prisma migrate dev -n init`.
2. Seed dictionaries (packages/db/seeds):
   - POPULATION: MSM,TGW,PWID,PWUD,FSW,RSW,YKP,PDL,MSP.
   - DISEASE: HepB,HepC,Syphilis,TB,Pneumonia,Chlamydia,Gonorrhoea,Trichomoniasis,HSV,HPV.
   - LAB_PANEL: CBC,Creatinine,SGPT_SGOT,Urinalysis,XRay,FBS,LipidPanel,CD4,HIV_VL.
   - LAB_TEST: include core analytes; minimally CD4_count, VL_copies, Hgb,WBC,Creatinine,ALT,AST.
   - MEDICATION & REGIMEN: TLD, 3HP, PrEP-TDF/FTC; STI meds (names only).
3. Apply manual SQL migration for search extensions, tsvector, and GIN/TRGM indexes (script in /packages/db/sql/001_search.sql). Commit it.

[AUTH]
4. Implement OTP request/verify endpoints:
   - POST /api/auth/otp/request {email|phone}
   - POST /api/auth/otp/verify {userId, code}
   Generate random 6–8 digit code, hash with bcrypt, store in otp_codes with expiry (5–10 min), throttle attempts.
   Pluggable providers: Resend (email) and Twilio (SMS). Add provider interfaces.
5. Implement session issuance (signed cookies + DB sessions). Add middleware to load session → user → roles.

[RBAC]
6. Define role constants and policies. Create helper `can(user, action, entity, record?)`. Enforce in all routes.
7. Seed roles + an admin user and sample accounts for each role.

[API]
8. Clients:
   - GET /api/clients?search&status&facility  → raw SQL query using search_vector.
   - GET /api/clients/:id → join ClinicalSummary, open Tasks.
   - POST /api/clients (zod validation, minimal required) → enforce facility scoping.
   - PATCH /api/clients/:id → audit old/new.
9. Encounters: POST /api/encounters; on insert, update clients.last_visit_at (or rely on DB trigger).
10. Labs: POST /api/labs/panels, POST /api/labs/results. Server validates panel/test lookups. Status auto PENDING→POSITIVE/NEGATIVE/INDETERMINATE where applicable.
11. STI: POST /api/sti/history (bulk for intake), POST /api/sti/screenings.
12. Pharmacy: POST /api/prescriptions, POST /api/dispenses. Update ClinicalSummary current regimens on change.
13. Tasks: GET /api/tasks?clientId; PATCH /api/tasks/:id (complete/dismiss).
14. Dashboard: GET /api/dashboard reading the materialized views.

[JOBS]
15. /api/jobs/refresh-summaries (nightly):
   - Compute baseline CD4, first VL date, viral_load_status.
   - Update current ARV/PrEP regimen ids from active prescriptions.
16. /api/jobs/generate-tasks (nightly):
   - REFILL_* from Dispense.nextRefillDate.
   - VL_MONITOR: policy check vs. last VL.
   - LABS_PENDING: policy vs. required panels per regimen.
   - LTFU_REVIEW: no Encounter/Dispense in N days.
17. /api/jobs/refresh-dashboard: refresh MVs concurrently.

[UI]
18. Theme tokens: implement CSS variables (--color-lucky-1/2/3, --color-accent-red). Wire Tailwind config.
19. Pages:
   - /login (OTP), /verify
   - / (Dashboard)
   - /clients (search + list)
   - /clients/[id] (profile with tabs; Tasks panel visible on the right)
   - Data entry modals: New Client, Lab Panel + Results, Prescription + Dispense, STI Screening.
20. Components: SearchInput (debounced, keyboard nav), KPI Cards, TaskList, LabPanelCard, PrescriptionCard, RegimenBadge, PopulationChips, StatusBadge, RedRibbonIcon (SVG).
21. Accessibility: focus traps, skip links, form labels, error announcements (ARIA live).

[OBSERVABILITY & SECURITY]
22. Implement AuditLog middleware for mutating routes; include actor, action, entity, entityId, before/after diffs, IP/UA.
23. Add rate limiting (per IP + per user) on auth, search, export endpoints.
24. Add unit tests for RBAC and for search query semantics; integration tests for task generation logic.

[DEPLOY]
25. Provision Postgres (Neon/Supabase/managed PG). Set DATABASE_URL, provider creds for email/SMS.
26. Configure Vercel Cron: nightly jobs in steps 15–17. Protect with HMAC secret.
27. Enable HTTPS only, secure cookies, CSP headers. Turn on error boundaries and safe logging (no PII).

DELIVERABLES
- Running app with seeded demo data, CI passing.
- Prisma migrations + manual SQL scripts in /packages/db/sql.
- README with environment variables and first‑run steps.

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HIV Prevention & Care Management System</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        'sans': ['Inter', 'system-ui', 'sans-serif'],
                        'mono': ['JetBrains Mono', 'monospace']
                    },
                    colors: {
                        'lucky-1': 'var(--color-lucky-1)',
                        'lucky-2': 'var(--color-lucky-2)', 
                        'lucky-3': 'var(--color-lucky-3)',
                        'accent-red': 'var(--color-accent-red)'
                    },
                    animation: {
                        'fade-in': 'fadeIn 0.5s ease-in-out',
                        'slide-up': 'slideUp 0.3s ease-out',
                        'bounce-subtle': 'bounceSubtle 2s infinite',
                        'glow': 'glow 2s ease-in-out infinite alternate'
                    }
                }
            }
        }
    </script>
    <style>
        :root {
            --color-lucky-1: #D4AF37;
            --color-lucky-2: #2E7D32;
            --color-lucky-3: #0D47A1;
            --color-accent-red: #E10600;
            --gradient-primary: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
            --gradient-secondary: linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%);
            --gradient-tertiary: linear-gradient(135deg, #0D47A1 0%, #1976D2 100%);
            --gradient-danger: linear-gradient(135deg, #E10600 0%, #FF1744 100%);
            --shadow-glow: 0 0 20px rgba(212, 175, 55, 0.3);
            --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-card-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        
        [data-theme="dark"] {
            --color-lucky-1: #F4D03F;
            --color-lucky-2: #4CAF50;
            --color-lucky-3: #1976D2;
            --color-accent-red: #FF1744;
            --shadow-glow: 0 0 20px rgba(244, 208, 63, 0.4);
            --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
            --shadow-card-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
        }
        
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
        }
        
        .gradient-primary { background: var(--gradient-primary); }
        .gradient-secondary { background: var(--gradient-secondary); }
        .gradient-tertiary { background: var(--gradient-tertiary); }
        .gradient-danger { background: var(--gradient-danger); }
        
        .glass-effect {
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        [data-theme="dark"] .glass-effect {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .card-hover {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: var(--shadow-card);
        }
        
        .card-hover:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-card-hover);
        }
        
        .pulse-subtle {
            animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .glow-effect {
            box-shadow: var(--shadow-glow);
            animation: glow 2s ease-in-out infinite alternate;
        }
        
        @keyframes pulse-subtle {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes bounceSubtle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
        }
        
        @keyframes glow {
            from { box-shadow: 0 0 5px rgba(212, 175, 55, 0.2); }
            to { box-shadow: 0 0 20px rgba(212, 175, 55, 0.4); }
        }
        
        .number-display {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            letter-spacing: -0.02em;
        }
        
        .ribbon-icon {
            width: 16px;
            height: 20px;
            background: var(--color-accent-red);
            position: relative;
            border-radius: 2px 2px 0 0;
        }
        
        .ribbon-icon::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 0;
            width: 0;
            height: 0;
            border-left: 8px solid var(--color-accent-red);
            border-right: 8px solid var(--color-accent-red);
            border-bottom: 8px solid transparent;
        }
        
        .search-highlight {
            background: rgba(212, 175, 55, 0.3);
            padding: 1px 2px;
            border-radius: 2px;
        }
        
        .status-active { background: var(--color-lucky-2); }
        .status-expired { background: #6B7280; }
        .status-transferred { background: var(--color-lucky-3); }
        .status-ltfu { background: #F59E0B; }
        
        .urgency-high { border-left: 4px solid var(--color-accent-red); }
        .urgency-medium { border-left: 4px solid #F59E0B; }
        .urgency-low { border-left: 4px solid var(--color-lucky-2); }
        
        .loading-skeleton {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
        }
        
        @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        
        [data-theme="dark"] {
            background: #1a1a1a;
            color: #ffffff;
        }
        
        [data-theme="dark"] .loading-skeleton {
            background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
            background-size: 200% 100%;
        }
        
        .focus-visible:focus {
            outline: 2px solid var(--color-lucky-1);
            outline-offset: 2px;
        }
        
        .tap-target {
            min-height: 44px;
            min-width: 44px;
        }
    </style>
</head>
<body class="bg-gray-50 dark:bg-gray-900 transition-colors duration-200" data-theme="light">
    <!-- App Container -->
    <div id="app" class="min-h-screen">
        <!-- Login Page -->
        <div id="loginPage" class="min-h-screen flex items-center justify-center gradient-tertiary p-4 relative overflow-hidden">
            <!-- Background Pattern -->
            <div class="absolute inset-0 opacity-10">
                <div class="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-xl"></div>
                <div class="absolute bottom-20 right-20 w-48 h-48 bg-white rounded-full blur-xl"></div>
                <div class="absolute top-1/2 left-1/3 w-24 h-24 bg-white rounded-full blur-lg"></div>
            </div>
            
            <div class="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md card-hover animate-fade-in relative z-10">
                <div class="flex items-center justify-center mb-8">
                    <div class="ribbon-icon mr-3 glow-effect"></div>
                    <h1 class="text-3xl font-bold bg-gradient-to-r from-lucky-3 to-lucky-1 bg-clip-text text-transparent">HIV Care Portal</h1>
                </div>
                
                <form class="space-y-6">
                    <div>
                        <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
                        <input type="text" id="username" class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-lucky-1 focus:border-transparent dark:bg-gray-700 dark:text-white tap-target" placeholder="Enter username" required>
                    </div>
                    
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                        <input type="password" id="password" class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-lucky-1 focus:border-transparent dark:bg-gray-700 dark:text-white tap-target" placeholder="Enter password" required>
                    </div>
                    
                    <div class="flex items-center justify-between">
                        <label class="flex items-center">
                            <input type="checkbox" class="rounded border-gray-300 text-lucky-1 focus:ring-lucky-1">
                            <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span>
                        </label>
                        <button type="button" onclick="showOTPOptions()" class="text-sm text-lucky-3 hover:underline">Forgot password?</button>
                    </div>
                    
                    <button type="button" onclick="showDashboard()" class="w-full bg-lucky-2 text-white py-3 px-4 rounded-lg hover:bg-opacity-90 focus:ring-2 focus:ring-lucky-1 focus:ring-offset-2 font-medium tap-target transition-colors">
                        Sign In
                    </button>
                </form>
                
                <div class="mt-6 text-center">
                    <button onclick="showOTPOptions()" class="text-lucky-3 hover:underline text-sm">Use OTP Authentication</button>
                </div>
            </div>
        </div>

        <!-- OTP Options Modal -->
        <div id="otpModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h2 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">Choose Authentication Method</h2>
                <div class="space-y-4">
                    <button onclick="sendOTP('email')" class="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-left tap-target">
                        <div class="font-medium text-gray-900 dark:text-white">📧 Email OTP</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">Send code to registered email</div>
                    </button>
                    <button onclick="sendOTP('sms')" class="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-left tap-target">
                        <div class="font-medium text-gray-900 dark:text-white">📱 SMS OTP</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">Send code to registered phone</div>
                    </button>
                </div>
                <button onclick="hideOTPOptions()" class="mt-4 w-full py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Cancel</button>
            </div>
        </div>

        <!-- OTP Verification -->
        <div id="otpVerification" class="hidden min-h-screen flex items-center justify-center bg-gradient-to-br from-lucky-3 to-lucky-2 p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
                <h2 class="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">Enter Verification Code</h2>
                <p class="text-center text-gray-600 dark:text-gray-400 mb-6">We've sent a 6-digit code to your <span id="otpMethod">email</span></p>
                
                <div class="flex justify-center space-x-2 mb-6">
                    <input type="text" maxlength="1" class="w-12 h-12 text-center border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-lucky-1 dark:bg-gray-700 dark:text-white text-lg font-bold" onkeyup="moveToNext(this, 0)">
                    <input type="text" maxlength="1" class="w-12 h-12 text-center border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-lucky-1 dark:bg-gray-700 dark:text-white text-lg font-bold" onkeyup="moveToNext(this, 1)">
                    <input type="text" maxlength="1" class="w-12 h-12 text-center border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-lucky-1 dark:bg-gray-700 dark:text-white text-lg font-bold" onkeyup="moveToNext(this, 2)">
                    <input type="text" maxlength="1" class="w-12 h-12 text-center border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-lucky-1 dark:bg-gray-700 dark:text-white text-lg font-bold" onkeyup="moveToNext(this, 3)">
                    <input type="text" maxlength="1" class="w-12 h-12 text-center border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-lucky-1 dark:bg-gray-700 dark:text-white text-lg font-bold" onkeyup="moveToNext(this, 4)">
                    <input type="text" maxlength="1" class="w-12 h-12 text-center border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-lucky-1 dark:bg-gray-700 dark:text-white text-lg font-bold" onkeyup="moveToNext(this, 5)">
                </div>
                
                <button onclick="verifyOTP()" class="w-full bg-lucky-2 text-white py-3 px-4 rounded-lg hover:bg-opacity-90 focus:ring-2 focus:ring-lucky-1 font-medium tap-target mb-4">
                    Verify Code
                </button>
                
                <div class="text-center">
                    <button onclick="resendOTP()" class="text-lucky-3 hover:underline text-sm">Resend Code</button>
                    <span class="mx-2 text-gray-400">|</span>
                    <button onclick="backToLogin()" class="text-gray-600 dark:text-gray-400 hover:underline text-sm">Back to Login</button>
                </div>
            </div>
        </div>

        <!-- Main Dashboard -->
        <div id="dashboard" class="hidden min-h-screen bg-gray-50 dark:bg-gray-900">
            <!-- Header -->
            <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        <!-- Logo and Title -->
                        <div class="flex items-center">
                            <div class="ribbon-icon mr-3"></div>
                            <h1 class="text-xl font-bold text-gray-900 dark:text-white">HIV Care Portal</h1>
                        </div>
                        
                        <!-- Global Search -->
                        <div class="flex-1 max-w-lg mx-8">
                            <div class="relative">
                                <input type="text" id="globalSearch" placeholder="Search clients (Name, UIC, Client Code, DoB)..." 
                                       class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-lucky-1 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                       onkeyup="performSearch(this.value)" onfocus="showSearchResults()">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                    </svg>
                                </div>
                                
                                <!-- Search Results Dropdown -->
                                <div id="searchResults" class="hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg mt-1 max-h-96 overflow-y-auto z-50">
                                    <div class="p-2 text-sm text-gray-500 dark:text-gray-400">Start typing to search clients...</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- User Menu -->
                        <div class="flex items-center space-x-4">
                            <button onclick="toggleTheme()" class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 tap-target" title="Toggle theme">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                                </svg>
                            </button>
                            
                            <div class="relative">
                                <button onclick="toggleUserMenu()" class="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white tap-target">
                                    <div class="w-8 h-8 bg-lucky-1 rounded-full flex items-center justify-center text-white font-bold">
                                        JD
                                    </div>
                                    <span class="hidden md:block">Dr. Jane Doe</span>
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </button>
                                
                                <div id="userMenu" class="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
                                    <div class="py-1">
                                        <a href="#" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Profile Settings</a>
                                        <a href="#" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Notifications</a>
                                        <div class="border-t border-gray-200 dark:border-gray-600"></div>
                                        <button onclick="logout()" class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Sign Out</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <!-- KPI Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    <div class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border-l-4 border-lucky-2 card-hover animate-fade-in relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-20 h-20 gradient-secondary opacity-10 rounded-full -mr-10 -mt-10"></div>
                        <div class="flex items-center justify-between relative z-10">
                            <div>
                                <p class="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Enrolled</p>
                                <p class="text-4xl font-bold text-gray-900 dark:text-white number-display">1,247</p>
                            </div>
                            <div class="p-4 gradient-secondary rounded-2xl shadow-lg">
                                <svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="mt-4 flex items-center">
                            <span class="text-sm font-semibold text-lucky-2 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">↗ +12 this month</span>
                        </div>
                    </div>

                    <div class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border-l-4 border-lucky-2 card-hover animate-fade-in relative overflow-hidden" style="animation-delay: 0.1s">
                        <div class="absolute top-0 right-0 w-20 h-20 gradient-secondary opacity-10 rounded-full -mr-10 -mt-10"></div>
                        <div class="flex items-center justify-between relative z-10">
                            <div>
                                <p class="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Active</p>
                                <p class="text-4xl font-bold text-gray-900 dark:text-white number-display">1,189</p>
                            </div>
                            <div class="p-4 gradient-secondary rounded-2xl shadow-lg">
                                <svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="mt-4">
                            <span class="text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">95.3% retention</span>
                        </div>
                    </div>

                    <div class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border-l-4 border-gray-400 card-hover animate-fade-in relative overflow-hidden" style="animation-delay: 0.2s">
                        <div class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 opacity-10 rounded-full -mr-10 -mt-10"></div>
                        <div class="flex items-center justify-between relative z-10">
                            <div>
                                <p class="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Expired</p>
                                <p class="text-4xl font-bold text-gray-900 dark:text-white number-display">23</p>
                            </div>
                            <div class="p-4 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl shadow-lg">
                                <svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="mt-4">
                            <span class="text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">Needs follow-up</span>
                        </div>
                    </div>

                    <div class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border-l-4 border-lucky-3 card-hover animate-fade-in relative overflow-hidden" style="animation-delay: 0.3s">
                        <div class="absolute top-0 right-0 w-20 h-20 gradient-tertiary opacity-10 rounded-full -mr-10 -mt-10"></div>
                        <div class="flex items-center justify-between relative z-10">
                            <div>
                                <p class="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Under Monitoring</p>
                                <p class="text-4xl font-bold text-gray-900 dark:text-white number-display">156</p>
                            </div>
                            <div class="p-4 gradient-tertiary rounded-2xl shadow-lg">
                                <svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="mt-4">
                            <span class="text-sm font-semibold text-gray-600 dark:text-gray-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">Close monitoring</span>
                        </div>
                    </div>

                    <div class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border-l-4 border-yellow-500 card-hover animate-fade-in relative overflow-hidden" style="animation-delay: 0.4s">
                        <div class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 opacity-10 rounded-full -mr-10 -mt-10"></div>
                        <div class="flex items-center justify-between relative z-10">
                            <div>
                                <p class="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">LTFU</p>
                                <p class="text-4xl font-bold text-gray-900 dark:text-white number-display">35</p>
                            </div>
                            <div class="p-4 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl shadow-lg">
                                <svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="mt-4">
                            <span class="text-sm font-semibold text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">Requires outreach</span>
                        </div>
                    </div>
                </div>

                <!-- Charts and Task Queue -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    <!-- Enrollment Trends -->
                    <div class="lg:col-span-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 card-hover animate-fade-in relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-32 h-32 gradient-secondary opacity-5 rounded-full -mr-16 -mt-16"></div>
                        <div class="flex items-center justify-between mb-6 relative z-10">
                            <div>
                                <h3 class="text-xl font-bold text-gray-900 dark:text-white">Enrollment Trends</h3>
                                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Monthly new client enrollments</p>
                            </div>
                            <div class="flex items-center space-x-2">
                                <div class="w-3 h-3 gradient-secondary rounded-full"></div>
                                <span class="text-sm font-medium text-gray-600 dark:text-gray-400">2024</span>
                            </div>
                        </div>
                        <div class="relative">
                            <canvas id="enrollmentChart" width="400" height="200" class="w-full"></canvas>
                        </div>
                        <div class="mt-4 flex items-center justify-between text-sm">
                            <div class="flex items-center space-x-4">
                                <div class="flex items-center space-x-2">
                                    <div class="w-2 h-2 gradient-secondary rounded-full"></div>
                                    <span class="text-gray-600 dark:text-gray-400">New Enrollments</span>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <div class="w-2 h-2 gradient-primary rounded-full"></div>
                                    <span class="text-gray-600 dark:text-gray-400">Target</span>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-semibold text-gray-900 dark:text-white">+18% vs last quarter</p>
                                <p class="text-xs text-green-600 dark:text-green-400">Above target</p>
                            </div>
                        </div>
                    </div>

                    <!-- Task Queue -->
                    <div class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 card-hover animate-fade-in relative overflow-hidden" style="animation-delay: 0.2s">
                        <div class="absolute top-0 right-0 w-24 h-24 gradient-danger opacity-5 rounded-full -mr-12 -mt-12"></div>
                        <div class="flex items-center justify-between mb-6 relative z-10">
                            <div>
                                <h3 class="text-xl font-bold text-gray-900 dark:text-white">Priority Tasks</h3>
                                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Urgent actions required</p>
                            </div>
                            <div class="gradient-danger text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg glow-effect">
                                12 overdue
                            </div>
                        </div>
                        
                        <div class="space-y-4">
                            <div class="urgency-high bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-xl pulse-subtle border border-red-200 dark:border-red-800/30">
                                <div class="flex items-start justify-between">
                                    <div class="flex items-start space-x-3">
                                        <div class="ribbon-icon mt-1"></div>
                                        <div>
                                            <p class="font-semibold text-gray-900 dark:text-white">VL Results Review</p>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">Client: Sarah Johnson</p>
                                            <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">UIC: HIV-2024-001247</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <span class="text-xs font-semibold text-red-700 dark:text-red-400 bg-red-200 dark:bg-red-900/50 px-2 py-1 rounded-full">3 days overdue</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="urgency-medium bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800/30">
                                <div class="flex items-start justify-between">
                                    <div class="flex items-start space-x-3">
                                        <div class="w-4 h-4 bg-yellow-500 rounded-full mt-1.5"></div>
                                        <div>
                                            <p class="font-semibold text-gray-900 dark:text-white">ARV Refill Due</p>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">Client: Michael Chen</p>
                                            <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">30-day supply expires today</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <span class="text-xs font-semibold text-yellow-700 dark:text-yellow-400 bg-yellow-200 dark:bg-yellow-900/50 px-2 py-1 rounded-full">Due today</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="urgency-low bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border border-green-200 dark:border-green-800/30">
                                <div class="flex items-start justify-between">
                                    <div class="flex items-start space-x-3">
                                        <div class="w-4 h-4 bg-green-500 rounded-full mt-1.5"></div>
                                        <div>
                                            <p class="font-semibold text-gray-900 dark:text-white">Routine Follow-up</p>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">Client: Emma Davis</p>
                                            <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">Quarterly check-in scheduled</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <span class="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-200 dark:bg-green-900/50 px-2 py-1 rounded-full">Due in 2 days</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <button onclick="showAllTasks()" class="w-full mt-6 gradient-tertiary text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]">
                            View All Tasks (47) →
                        </button>
                    </div>
                </div>

                <!-- Population Breakdown -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Population Breakdown</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-lucky-1 rounded-full mx-auto mb-2 flex items-center justify-center">
                                <span class="text-white font-bold text-lg">67%</span>
                            </div>
                            <p class="text-sm font-medium text-gray-900 dark:text-white">MSM</p>
                            <p class="text-xs text-gray-600 dark:text-gray-400">836 clients</p>
                        </div>
                        
                        <div class="text-center">
                            <div class="w-16 h-16 bg-lucky-2 rounded-full mx-auto mb-2 flex items-center justify-center">
                                <span class="text-white font-bold text-lg">18%</span>
                            </div>
                            <p class="text-sm font-medium text-gray-900 dark:text-white">Heterosexual</p>
                            <p class="text-xs text-gray-600 dark:text-gray-400">224 clients</p>
                        </div>
                        
                        <div class="text-center">
                            <div class="w-16 h-16 bg-lucky-3 rounded-full mx-auto mb-2 flex items-center justify-center">
                                <span class="text-white font-bold text-lg">12%</span>
                            </div>
                            <p class="text-sm font-medium text-gray-900 dark:text-white">PWID</p>
                            <p class="text-xs text-gray-600 dark:text-gray-400">150 clients</p>
                        </div>
                        
                        <div class="text-center">
                            <div class="w-16 h-16 bg-accent-red rounded-full mx-auto mb-2 flex items-center justify-center">
                                <span class="text-white font-bold text-lg">3%</span>
                            </div>
                            <p class="text-sm font-medium text-gray-900 dark:text-white">Other</p>
                            <p class="text-xs text-gray-600 dark:text-gray-400">37 clients</p>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button onclick="showNewClientWizard()" class="bg-lucky-2 text-white p-6 rounded-lg hover:bg-opacity-90 transition-colors tap-target">
                        <div class="flex items-center justify-center mb-2">
                            <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                        </div>
                        <p class="font-medium">New Client</p>
                        <p class="text-sm opacity-90">Enroll new client</p>
                    </button>
                    
                    <button onclick="showLabWizard()" class="bg-lucky-3 text-white p-6 rounded-lg hover:bg-opacity-90 transition-colors tap-target">
                        <div class="flex items-center justify-center mb-2">
                            <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                        <p class="font-medium">Lab Results</p>
                        <p class="text-sm opacity-90">Enter lab data</p>
                    </button>
                    
                    <button onclick="showMedicationWizard()" class="bg-accent-red text-white p-6 rounded-lg hover:bg-opacity-90 transition-colors tap-target">
                        <div class="flex items-center justify-center mb-2">
                            <div class="ribbon-icon"></div>
                        </div>
                        <p class="font-medium">Prescriptions</p>
                        <p class="text-sm opacity-90">ARV/PrEP management</p>
                    </button>
                    
                    <button onclick="showSTIWizard()" class="bg-lucky-1 text-white p-6 rounded-lg hover:bg-opacity-90 transition-colors tap-target">
                        <div class="flex items-center justify-center mb-2">
                            <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                            </svg>
                        </div>
                        <p class="font-medium">STI Screening</p>
                        <p class="text-sm opacity-90">Record screening</p>
                    </button>
                </div>
            </main>
        </div>

        <!-- Client Profile Page -->
        <div id="clientProfile" class="hidden min-h-screen bg-gray-50 dark:bg-gray-900">
            <!-- Header (same as dashboard) -->
            <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        <div class="flex items-center">
                            <button onclick="showDashboard()" class="mr-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                </svg>
                            </button>
                            <div class="ribbon-icon mr-3"></div>
                            <h1 class="text-xl font-bold text-gray-900 dark:text-white">Client Profile</h1>
                        </div>
                        
                        <div class="flex-1 max-w-lg mx-8">
                            <div class="relative">
                                <input type="text" placeholder="Search clients..." 
                                       class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-lucky-1 focus:border-transparent dark:bg-gray-700 dark:text-white">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-4">
                            <button onclick="toggleTheme()" class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 tap-target">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                                </svg>
                            </button>
                            <div class="w-8 h-8 bg-lucky-1 rounded-full flex items-center justify-center text-white font-bold">JD</div>
                        </div>
                    </div>
                </div>
            </header>

            <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <!-- Client Header -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center space-x-4">
                                <div class="w-16 h-16 bg-lucky-1 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                    SJ
                                </div>
                                <div>
                                    <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                                        Sarah Johnson
                                        <div class="ribbon-icon ml-3" title="On ARV Treatment"></div>
                                    </h1>
                                    <div class="flex items-center space-x-4 mt-1">
                                        <span class="text-gray-600 dark:text-gray-400">UIC: HIV-2024-001247</span>
                                        <button onclick="copyToClipboard('HIV-2024-001247')" class="text-lucky-3 hover:text-lucky-3/80 text-sm">
                                            📋 Copy
                                        </button>
                                        <span class="text-gray-600 dark:text-gray-400">Client Code: SJ-001247</span>
                                        <button onclick="copyToClipboard('SJ-001247')" class="text-lucky-3 hover:text-lucky-3/80 text-sm">
                                            📋 Copy
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <span class="status-active text-white px-3 py-1 rounded-full text-sm font-medium">ACTIVE</span>
                            </div>
                        </div>
                        
                        <!-- Quick Facts -->
                        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div>
                                <p class="text-xs text-gray-600 dark:text-gray-400">Age</p>
                                <p class="font-semibold text-gray-900 dark:text-white">34 years</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-600 dark:text-gray-400">Date of Birth</p>
                                <p class="font-semibold text-gray-900 dark:text-white">Mar 15, 1990</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-600 dark:text-gray-400">Sex at Birth</p>
                                <p class="font-semibold text-gray-900 dark:text-white">Female</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-600 dark:text-gray-400">Gender Identity</p>
                                <p class="font-semibold text-gray-900 dark:text-white">Female</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-600 dark:text-gray-400">Population</p>
                                <p class="font-semibold text-gray-900 dark:text-white">Heterosexual</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-600 dark:text-gray-400">Case Manager</p>
                                <p class="font-semibold text-gray-900 dark:text-white">Dr. Smith</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Reminders/Next Steps -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
                    <div class="p-6">
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reminders & Next Steps</h2>
                        <div class="space-y-3">
                            <div class="urgency-high bg-red-50 dark:bg-red-900/20 p-4 rounded-lg pulse-subtle">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-3">
                                        <div class="ribbon-icon"></div>
                                        <div>
                                            <p class="font-medium text-gray-900 dark:text-white">Viral Load Results Review</p>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">Lab drawn on Dec 15, 2024 - Results pending review</p>
                                        </div>
                                    </div>
                                    <span class="text-sm text-red-600 dark:text-red-400 font-medium">3 days overdue</span>
                                </div>
                            </div>
                            
                            <div class="urgency-medium bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-3">
                                        <svg class="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <div>
                                            <p class="font-medium text-gray-900 dark:text-white">ARV Refill Appointment</p>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">30-day supply expires Dec 22, 2024</p>
                                        </div>
                                    </div>
                                    <span class="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Due today</span>
                                </div>
                            </div>
                            
                            <div class="urgency-low bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-3">
                                        <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                                        </svg>
                                        <div>
                                            <p class="font-medium text-gray-900 dark:text-white">STI Screening Due</p>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">Last screening: Sep 15, 2024</p>
                                        </div>
                                    </div>
                                    <span class="text-sm text-green-600 dark:text-green-400 font-medium">Due in 5 days</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Clinical Summary -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
                    <div class="p-6">
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Clinical Summary</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Baseline CD4</p>
                                <p class="text-2xl font-bold text-gray-900 dark:text-white">187</p>
                                <p class="text-xs text-gray-500 dark:text-gray-500">cells/μL (Jan 2024)</p>
                            </div>
                            
                            <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">First VL Date</p>
                                <p class="text-lg font-bold text-gray-900 dark:text-white">Feb 15, 2024</p>
                                <p class="text-xs text-gray-500 dark:text-gray-500">Initial: 45,000 copies/mL</p>
                            </div>
                            
                            <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Current VL Status</p>
                                <div class="flex items-center justify-center space-x-2">
                                    <span class="bg-lucky-2 text-white px-3 py-1 rounded-full text-sm font-medium">Undetectable</span>
                                    <div class="ribbon-icon"></div>
                                </div>
                                <p class="text-xs text-gray-500 dark:text-gray-500">< 20 copies/mL</p>
                            </div>
                            
                            <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Regimen</p>
                                <p class="text-sm font-bold text-gray-900 dark:text-white">Bictegravir/TAF/FTC</p>
                                <p class="text-xs text-gray-500 dark:text-gray-500">Started: Feb 2024</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div class="border-b border-gray-200 dark:border-gray-700">
                        <nav class="flex space-x-8 px-6" aria-label="Tabs">
                            <button onclick="showTab('labs')" class="tab-button border-b-2 border-lucky-1 text-lucky-1 py-4 px-1 text-sm font-medium">
                                Labs
                            </button>
                            <button onclick="showTab('medications')" class="tab-button border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
                                Medications
                            </button>
                            <button onclick="showTab('encounters')" class="tab-button border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
                                Encounters
                            </button>
                            <button onclick="showTab('sti')" class="tab-button border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
                                STI History
                            </button>
                            <button onclick="showTab('transfers')" class="tab-button border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
                                Transfers
                            </button>
                            <button onclick="showTab('notes')" class="tab-button border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
                                Notes
                            </button>
                        </nav>
                    </div>
                    
                    <!-- Labs Tab Content -->
                    <div id="labsTab" class="tab-content p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Laboratory Results</h3>
                            <button onclick="showLabWizard()" class="bg-lucky-3 text-white px-4 py-2 rounded-lg hover:bg-opacity-90 text-sm font-medium tap-target">
                                Add Lab Results
                            </button>
                        </div>
                        
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead class="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Test Type</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Result</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference Range</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">Dec 15, 2024</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">HIV Viral Load</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">< 20 copies/mL</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">< 20 copies/mL</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="bg-lucky-2 text-white px-2 py-1 rounded-full text-xs">Undetectable</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">Dec 15, 2024</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">CD4 Count</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">456 cells/μL</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">500-1200 cells/μL</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs">Low Normal</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">Sep 15, 2024</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">HIV Viral Load</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">< 20 copies/mL</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">< 20 copies/mL</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="bg-lucky-2 text-white px-2 py-1 rounded-full text-xs">Undetectable</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Other tab contents would be similar structures -->
                    <div id="medicationsTab" class="tab-content p-6 hidden">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Medication History</h3>
                            <button onclick="showMedicationWizard()" class="bg-accent-red text-white px-4 py-2 rounded-lg hover:bg-opacity-90 text-sm font-medium tap-target flex items-center">
                                <div class="ribbon-icon mr-2"></div>
                                New Prescription
                            </button>
                        </div>
                        
                        <div class="space-y-4">
                            <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-3">
                                        <div class="ribbon-icon"></div>
                                        <div>
                                            <h4 class="font-semibold text-gray-900 dark:text-white">Bictegravir/TAF/FTC (Biktarvy)</h4>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">50/25/200 mg - One tablet daily</p>
                                            <p class="text-xs text-gray-500 dark:text-gray-500">Started: Feb 15, 2024 | Last Refill: Nov 22, 2024</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <span class="bg-lucky-2 text-white px-3 py-1 rounded-full text-sm font-medium">Active</span>
                                        <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">30-day supply</p>
                                        <p class="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Expires: Dec 22, 2024</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="encountersTab" class="tab-content p-6 hidden">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Visit History</h3>
                        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                            </svg>
                            <p class="mt-2">No encounters recorded yet</p>
                        </div>
                    </div>
                    
                    <div id="stiTab" class="tab-content p-6 hidden">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">STI Screening History</h3>
                            <button onclick="showSTIWizard()" class="bg-lucky-1 text-white px-4 py-2 rounded-lg hover:bg-opacity-90 text-sm font-medium tap-target">
                                New Screening
                            </button>
                        </div>
                        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                            </svg>
                            <p class="mt-2">Last screening: Sep 15, 2024</p>
                            <p class="text-sm">Next screening due: Dec 27, 2024</p>
                        </div>
                    </div>
                    
                    <div id="transfersTab" class="tab-content p-6 hidden">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Transfer History</h3>
                        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                            </svg>
                            <p class="mt-2">No transfers recorded</p>
                        </div>
                    </div>
                    
                    <div id="notesTab" class="tab-content p-6 hidden">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Clinical Notes</h3>
                        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                            <p class="mt-2">No notes available</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <script>
        // Theme Management
        function toggleTheme() {
            const body = document.body;
            const currentTheme = body.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        }

        // Initialize theme from localStorage
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);

        // Navigation Functions
        function showDashboard() {
            hideAllPages();
            document.getElementById('dashboard').classList.remove('hidden');
        }

        function showClientProfile() {
            hideAllPages();
            document.getElementById('clientProfile').classList.remove('hidden');
        }

        function hideAllPages() {
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('otpVerification').classList.add('hidden');
            document.getElementById('dashboard').classList.add('hidden');
            document.getElementById('clientProfile').classList.add('hidden');
        }

        // Login Functions
        function showOTPOptions() {
            document.getElementById('otpModal').classList.remove('hidden');
        }

        function hideOTPOptions() {
            document.getElementById('otpModal').classList.add('hidden');
        }

        function sendOTP(method) {
            document.getElementById('otpMethod').textContent = method;
            hideOTPOptions();
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('otpVerification').classList.remove('hidden');
        }

        function backToLogin() {
            document.getElementById('otpVerification').classList.add('hidden');
            document.getElementById('loginPage').classList.remove('hidden');
        }

        function verifyOTP() {
            showDashboard();
        }

        function resendOTP() {
            alert('OTP resent successfully!');
        }

        function logout() {
            hideAllPages();
            document.getElementById('loginPage').classList.remove('hidden');
        }

        // OTP Input Navigation
        function moveToNext(current, index) {
            if (current.value.length === 1 && index < 5) {
                const inputs = document.querySelectorAll('#otpVerification input[type="text"]');
                inputs[index + 1].focus();
            }
        }

        // User Menu
        function toggleUserMenu() {
            const menu = document.getElementById('userMenu');
            menu.classList.toggle('hidden');
        }

        // Search Functions
        function performSearch(query) {
            const resultsDiv = document.getElementById('searchResults');
            if (query.length === 0) {
                resultsDiv.innerHTML = '<div class="p-2 text-sm text-gray-500 dark:text-gray-400">Start typing to search clients...</div>';
                return;
            }

            // Mock search results
            const mockResults = [
                { name: 'Sarah Johnson', uic: 'HIV-2024-001247', code: 'SJ-001247', dob: 'Mar 15, 1990' },
                { name: 'Michael Chen', uic: 'HIV-2024-001248', code: 'MC-001248', dob: 'Jul 22, 1985' },
                { name: 'Emma Davis', uic: 'HIV-2024-001249', code: 'ED-001249', dob: 'Nov 8, 1992' }
            ];

            const filtered = mockResults.filter(client => 
                client.name.toLowerCase().includes(query.toLowerCase()) ||
                client.uic.toLowerCase().includes(query.toLowerCase()) ||
                client.code.toLowerCase().includes(query.toLowerCase()) ||
                client.dob.includes(query)
            );

            let html = '';
            filtered.forEach(client => {
                html += `
                    <div class="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600" onclick="selectClient('${client.uic}')">
                        <div class="font-medium text-gray-900 dark:text-white">${highlightMatch(client.name, query)}</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                            UIC: ${highlightMatch(client.uic, query)} | Code: ${highlightMatch(client.code, query)} | DoB: ${highlightMatch(client.dob, query)}
                        </div>
                    </div>
                `;
            });

            if (html === '') {
                html = '<div class="p-2 text-sm text-gray-500 dark:text-gray-400">No clients found</div>';
            }

            resultsDiv.innerHTML = html;
        }

        function highlightMatch(text, query) {
            if (!query) return text;
            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, '<span class="search-highlight">$1</span>');
        }

        function showSearchResults() {
            document.getElementById('searchResults').classList.remove('hidden');
        }

        function selectClient(uic) {
            document.getElementById('searchResults').classList.add('hidden');
            document.getElementById('globalSearch').value = '';
            showClientProfile();
        }

        // Hide search results when clicking outside
        document.addEventListener('click', function(event) {
            const searchContainer = document.querySelector('.relative');
            const searchResults = document.getElementById('searchResults');
            if (!searchContainer.contains(event.target)) {
                searchResults.classList.add('hidden');
            }
        });

        // Tab Functions
        function showTab(tabName) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.add('hidden');
            });
            
            // Remove active state from all tab buttons
            document.querySelectorAll('.tab-button').forEach(button => {
                button.classList.remove('border-lucky-1', 'text-lucky-1');
                button.classList.add('border-transparent', 'text-gray-500');
            });
            
            // Show selected tab content
            document.getElementById(tabName + 'Tab').classList.remove('hidden');
            
            // Add active state to selected tab button
            event.target.classList.remove('border-transparent', 'text-gray-500');
            event.target.classList.add('border-lucky-1', 'text-lucky-1');
        }

        // Utility Functions
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                // Show temporary success message
                const button = event.target;
                const originalText = button.textContent;
                button.textContent = '✓ Copied';
                setTimeout(() => {
                    button.textContent = originalText;
                }, 2000);
            });
        }

        // Wizard Functions (placeholders)
        function showNewClientWizard() {
            alert('New Client Wizard would open here');
        }

        function showLabWizard() {
            alert('Lab Results Wizard would open here');
        }

        function showMedicationWizard() {
            alert('Medication Wizard would open here');
        }

        function showSTIWizard() {
            alert('STI Screening Wizard would open here');
        }

        function showAllTasks() {
            alert('All Tasks view would open here');
        }

        // Keyboard Navigation
        document.addEventListener('keydown', function(event) {
            // Global search shortcut (Ctrl/Cmd + K)
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                document.getElementById('globalSearch').focus();
            }
            
            // Escape to close modals/dropdowns
            if (event.key === 'Escape') {
                document.getElementById('otpModal').classList.add('hidden');
                document.getElementById('userMenu').classList.add('hidden');
                document.getElementById('searchResults').classList.add('hidden');
            }
        });

        // Chart initialization
        function initializeChart() {
            const canvas = document.getElementById('enrollmentChart');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            
            // Create gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, 'rgba(46, 125, 50, 0.8)');
            gradient.addColorStop(1, 'rgba(46, 125, 50, 0.1)');
            
            const targetGradient = ctx.createLinearGradient(0, 0, 0, 200);
            targetGradient.addColorStop(0, 'rgba(212, 175, 55, 0.6)');
            targetGradient.addColorStop(1, 'rgba(212, 175, 55, 0.1)');
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: 'New Enrollments',
                        data: [45, 52, 38, 61, 73, 89, 94, 87, 102, 95, 108, 115],
                        borderColor: '#2E7D32',
                        backgroundColor: gradient,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#2E7D32',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }, {
                        label: 'Target',
                        data: [50, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
                        borderColor: '#D4AF37',
                        backgroundColor: targetGradient,
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.2,
                        pointBackgroundColor: '#D4AF37',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#D4AF37',
                            borderWidth: 1,
                            cornerRadius: 8,
                            displayColors: true,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.parsed.y + ' clients';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#6B7280',
                                font: {
                                    family: 'Inter',
                                    size: 12
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(107, 114, 128, 0.1)',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#6B7280',
                                font: {
                                    family: 'Inter',
                                    size: 12
                                },
                                callback: function(value) {
                                    return value + '';
                                }
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuart'
                    }
                }
            });
        }

        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
            // Focus first input on login page
            document.getElementById('username').focus();
            
            // Initialize chart when dashboard is shown
            setTimeout(() => {
                if (!document.getElementById('dashboard').classList.contains('hidden')) {
                    initializeChart();
                }
            }, 100);
        });

        // Override showDashboard to initialize chart
        const originalShowDashboard = showDashboard;
        showDashboard = function() {
            originalShowDashboard();
            setTimeout(initializeChart, 100);
        };
    </script>
<script>(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'9709960ec2bfb9f0',t:'MTc1NTQzODA1Ny4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();</script></body>
</html>

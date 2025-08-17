-- Extensions for search functionality
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Normalized text search column for clients
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', unaccent(coalesce(lower(legal_surname), ''))), 'A') ||
  setweight(to_tsvector('simple', unaccent(coalesce(lower(legal_first_name), ''))), 'A') ||
  setweight(to_tsvector('simple', unaccent(coalesce(lower(preferred_name), ''))), 'B') ||
  setweight(to_tsvector('simple', unaccent(coalesce(lower(client_code), ''))), 'A') ||
  setweight(to_tsvector('simple', unaccent(coalesce(lower(uic), ''))), 'A') ||
  setweight(to_tsvector('simple', unaccent(coalesce(lower(contact_number), ''))), 'C')
) STORED;

-- Search indexes
CREATE INDEX IF NOT EXISTS clients_search_gin ON clients USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS clients_surname_trgm ON clients USING GIN (legal_surname gin_trgm_ops);
CREATE INDEX IF NOT EXISTS clients_phone_trgm ON clients USING GIN (contact_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS clients_dob_idx ON clients (date_of_birth);
CREATE INDEX IF NOT EXISTS clients_status_idx ON clients (status);
CREATE INDEX IF NOT EXISTS clients_uic_idx ON clients (uic);
CREATE INDEX IF NOT EXISTS clients_client_code_idx ON clients (client_code);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS clients_facility_status_idx ON clients (facility_id, status);
CREATE INDEX IF NOT EXISTS clients_case_manager_idx ON clients (case_manager_id);
CREATE INDEX IF NOT EXISTS clients_last_visit_idx ON clients (last_visit_at DESC);

-- Lookup optimization
CREATE INDEX IF NOT EXISTS lookups_type_code_idx ON lookups (type, code);
CREATE INDEX IF NOT EXISTS lookups_active_idx ON lookups (active) WHERE active = true;

-- Lab panels optimization  
CREATE INDEX IF NOT EXISTS lab_panels_client_reported_idx ON lab_panels (client_id, reported_at DESC);
CREATE INDEX IF NOT EXISTS lab_panels_status_idx ON lab_panels (status);

-- Tasks optimization
CREATE INDEX IF NOT EXISTS tasks_client_type_status_idx ON tasks (client_id, type, status);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks (due_date) WHERE status = 'OPEN';
CREATE INDEX IF NOT EXISTS tasks_assigned_role_idx ON tasks (assigned_to_role_id) WHERE status = 'OPEN';

-- Prescriptions optimization
CREATE INDEX IF NOT EXISTS prescriptions_client_active_idx ON prescriptions (client_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS prescriptions_category_active_idx ON prescriptions (category, is_active) WHERE is_active = true;

-- Audit log optimization (for reporting)
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_action_idx ON audit_logs (user_id, action, "createdAt" DESC);
-- Triggers to maintain clients.last_visit_at from encounters and dispenses

-- Function to update last_visit_at from encounters
CREATE OR REPLACE FUNCTION update_last_visit_from_encounter()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE clients 
  SET last_visit_at = GREATEST(coalesce(last_visit_at, 'epoch'::timestamp), NEW.date)
  WHERE id = NEW.client_id;
  RETURN NEW;
END; $$;

-- Trigger for encounters
CREATE TRIGGER trg_encounter_last_visit
AFTER INSERT OR UPDATE ON encounters
FOR EACH ROW EXECUTE FUNCTION update_last_visit_from_encounter();

-- Function to update last_visit_at from dispenses
CREATE OR REPLACE FUNCTION update_last_visit_from_dispense()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE clients 
  SET last_visit_at = GREATEST(
    coalesce(last_visit_at, 'epoch'::timestamp), 
    NEW.dispensed_at
  )
  WHERE id = (
    SELECT client_id FROM prescriptions WHERE id = NEW.prescription_id
  );
  RETURN NEW;
END; $$;

-- Trigger for dispenses
CREATE TRIGGER trg_dispense_last_visit
AFTER INSERT OR UPDATE ON dispenses
FOR EACH ROW EXECUTE FUNCTION update_last_visit_from_dispense();

-- Function to clean up completed tasks when new encounter/dispense occurs
CREATE OR REPLACE FUNCTION cleanup_ltfu_tasks_on_activity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE tasks 
  SET status = 'DONE', completed_at = NOW()
  WHERE client_id = NEW.client_id 
    AND type = 'LTFU_REVIEW' 
    AND status = 'OPEN';
  RETURN NEW;
END; $$;

-- Trigger to clean LTFU tasks on new encounters
CREATE TRIGGER trg_encounter_cleanup_ltfu
AFTER INSERT ON encounters
FOR EACH ROW EXECUTE FUNCTION cleanup_ltfu_tasks_on_activity();

-- Trigger to clean LTFU tasks on new dispenses
CREATE OR REPLACE FUNCTION cleanup_ltfu_tasks_on_dispense()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE tasks 
  SET status = 'DONE', completed_at = NOW()
  WHERE client_id = (
    SELECT client_id FROM prescriptions WHERE id = NEW.prescription_id
  )
    AND type = 'LTFU_REVIEW' 
    AND status = 'OPEN';
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_dispense_cleanup_ltfu
AFTER INSERT ON dispenses
FOR EACH ROW EXECUTE FUNCTION cleanup_ltfu_tasks_on_dispense();
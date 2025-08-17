-- Materialized views for dashboard performance optimization

-- Enrollments by month trend
CREATE MATERIALIZED VIEW mv_enrollments_by_month AS
SELECT 
  date_trunc('month', date_enrolled) AS month,
  count(*) AS total,
  count(*) FILTER (WHERE sex_assigned_at_birth = 'MALE') AS male_count,
  count(*) FILTER (WHERE sex_assigned_at_birth = 'FEMALE') AS female_count
FROM clients 
GROUP BY date_trunc('month', date_enrolled)
ORDER BY month DESC;

CREATE UNIQUE INDEX mv_enrollments_by_month_month_idx ON mv_enrollments_by_month (month);

-- Client status distribution
CREATE MATERIALIZED VIEW mv_status_counts AS
SELECT 
  status,
  count(*) AS total,
  round(100.0 * count(*) / sum(count(*)) OVER (), 2) AS percentage
FROM clients 
GROUP BY status;

CREATE UNIQUE INDEX mv_status_counts_status_idx ON mv_status_counts (status);

-- Population distribution
CREATE MATERIALIZED VIEW mv_population_counts AS
SELECT 
  l.label AS population,
  l.code AS population_code,
  count(*) AS total,
  round(100.0 * count(*) / (SELECT count(*) FROM clients), 2) AS percentage
FROM client_population_map m
JOIN lookups l ON l.id = m.population_id
WHERE l.type = 'POPULATION'
GROUP BY l.label, l.code
ORDER BY total DESC;

CREATE UNIQUE INDEX mv_population_counts_code_idx ON mv_population_counts (population_code);

-- Task summary for dashboard
CREATE MATERIALIZED VIEW mv_task_summary AS
SELECT 
  type,
  status,
  count(*) AS total,
  count(*) FILTER (WHERE due_date <= CURRENT_DATE) AS overdue_count
FROM tasks
GROUP BY type, status;

CREATE UNIQUE INDEX mv_task_summary_type_status_idx ON mv_task_summary (type, status);

-- Facility metrics
CREATE MATERIALIZED VIEW mv_facility_metrics AS
SELECT 
  f.id,
  f.name AS facility_name,
  f.code AS facility_code,
  count(c.id) AS total_clients,
  count(c.id) FILTER (WHERE c.status = 'ACTIVE') AS active_clients,
  count(c.id) FILTER (WHERE c.last_visit_at >= CURRENT_DATE - INTERVAL '30 days') AS recent_visits,
  count(DISTINCT u.id) AS staff_count
FROM facilities f
LEFT JOIN clients c ON c.facility_id = f.id
LEFT JOIN users u ON u.facility_id = f.id
GROUP BY f.id, f.name, f.code;

CREATE UNIQUE INDEX mv_facility_metrics_id_idx ON mv_facility_metrics (id);

-- ARV/PrEP regimen distribution
CREATE MATERIALIZED VIEW mv_regimen_distribution AS
SELECT 
  r.name AS regimen_name,
  r.category,
  count(*) AS active_prescriptions,
  count(DISTINCT p.client_id) AS unique_clients
FROM prescriptions p
JOIN regimens r ON r.id = p.regimen_id
WHERE p.is_active = true
  AND (p.end_date IS NULL OR p.end_date > CURRENT_DATE)
GROUP BY r.name, r.category;

CREATE UNIQUE INDEX mv_regimen_distribution_name_cat_idx ON mv_regimen_distribution (regimen_name, category);

-- Recent lab activity
CREATE MATERIALIZED VIEW mv_lab_activity AS
SELECT 
  l.label AS panel_type,
  count(*) AS panels_completed,
  count(DISTINCT lp.client_id) AS unique_clients,
  avg(EXTRACT(days FROM (lp.reported_at - lp.ordered_at))) AS avg_turnaround_days
FROM lab_panels lp
JOIN lookups l ON l.id = lp.panel_type_id
WHERE lp.reported_at >= CURRENT_DATE - INTERVAL '30 days'
  AND lp.status = 'POSITIVE'
  AND l.type = 'LAB_PANEL'
GROUP BY l.label, l.code;

CREATE UNIQUE INDEX mv_lab_activity_panel_idx ON mv_lab_activity (panel_type);
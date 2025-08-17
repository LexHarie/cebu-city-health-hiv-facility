# Background Jobs Configuration

## Overview

This system uses Vercel Cron to schedule background jobs for maintaining data integrity and generating automated tasks.

## Job Endpoints

### 1. Refresh Clinical Summaries (`/api/jobs/refresh-summaries`)
- **Schedule**: Daily at 2:00 AM UTC
- **Purpose**: Updates clinical summaries with latest lab results and medication status
- **Operations**:
  - Recalculates baseline CD4 and viral load status
  - Updates current ARV/PrEP regimen references
  - Maintains data consistency across clinical_summaries table

### 2. Generate Automated Tasks (`/api/jobs/generate-tasks`)
- **Schedule**: Daily at 3:00 AM UTC  
- **Purpose**: Creates system-generated tasks for patient care management
- **Task Types Generated**:
  - `LTFU_REVIEW`: Clients with no activity for 90+ days
  - `LABS_PENDING`: Missing required lab panels (VL every 6-12 months)
  - `REFILL_ARV`/`REFILL_PREP`: Upcoming medication refills (3-day window)
  - `VL_MONITOR`: Annual viral load monitoring requirements

### 3. Refresh Dashboard Data (`/api/jobs/refresh-dashboard`)
- **Schedule**: Every 6 hours
- **Purpose**: Updates materialized views for dashboard performance
- **Views Refreshed**:
  - `mv_enrollments_by_month`: Monthly enrollment trends
  - `mv_status_counts`: Client status distribution
  - `mv_population_counts`: Key population statistics
  - `mv_task_summary`: Task type and status metrics
  - `mv_facility_metrics`: Per-facility performance data

## Vercel Cron Configuration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/jobs/refresh-summaries",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/jobs/generate-tasks", 
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/jobs/refresh-dashboard",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## Environment Variables

Required environment variable:
- `CRON_SECRET`: Bearer token for authenticating cron job requests

## Database Triggers

Automatic triggers maintain data consistency:
- Updates `clients.last_visit_at` from encounters and dispenses
- Auto-completes LTFU tasks when patient activity resumes
- Maintains referential integrity across clinical data

## Monitoring

All jobs log execution status and errors. Monitor via:
- Vercel function logs
- Database audit logs for data modifications
- Task generation metrics in dashboard
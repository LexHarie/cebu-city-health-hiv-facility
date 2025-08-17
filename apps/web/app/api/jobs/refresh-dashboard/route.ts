import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_enrollments_by_month`
      await tx.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_status_counts`
      await tx.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_population_counts`
      await tx.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_task_summary`
      await tx.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_facility_metrics`
    })

    const metrics = await generateDashboardMetrics(prisma)

    return NextResponse.json({ 
      success: true, 
      message: 'Dashboard data refreshed successfully',
      metrics
    })

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error refreshing dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to refresh dashboard data' },
      { status: 500 }
    )
  }
}

async function generateDashboardMetrics(prisma: PrismaClient) {
  const [
    enrollmentTrends,
    statusCounts,
    populationCounts,
    taskSummary,
    facilityMetrics
  ] = await Promise.all([
    prisma.$queryRaw`SELECT * FROM mv_enrollments_by_month ORDER BY month DESC LIMIT 12`,
    prisma.$queryRaw`SELECT * FROM mv_status_counts`,
    prisma.$queryRaw`SELECT * FROM mv_population_counts ORDER BY total DESC`,
    prisma.$queryRaw`SELECT * FROM mv_task_summary`,
    prisma.$queryRaw`SELECT * FROM mv_facility_metrics ORDER BY total_clients DESC`
  ])

  const recentActivity = await prisma.$queryRaw`
    SELECT 
      'encounter' as type,
      COUNT(*) as count
    FROM encounters
    WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    UNION ALL
    SELECT 
      'dispense' as type,
      COUNT(*) as count
    FROM dispenses d
    JOIN prescriptions p ON p.id = d.prescription_id
    WHERE d.dispensed_at >= CURRENT_DATE - INTERVAL '7 days'
    UNION ALL
    SELECT 
      'lab_result' as type,
      COUNT(*) as count
    FROM lab_panels
    WHERE reported_at >= CURRENT_DATE - INTERVAL '7 days'
  `

  const criticalTasks = await prisma.task.count({
    where: {
      status: 'OPEN',
      type: {
        in: ['LTFU_REVIEW', 'VL_MONITOR', 'LABS_PENDING']
      },
      dueDate: {
        lte: new Date()
      }
    }
  })

  return {
    enrollmentTrends,
    statusCounts,
    populationCounts,
    taskSummary,
    facilityMetrics,
    recentActivity,
    criticalTasksCount: criticalTasks
  }
}
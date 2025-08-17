import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@cebu-health/db'
import { requireAuth } from '@cebu-health/lib/auth/sessions'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    
    const facilityFilter = session.facilityId ? { facilityId: session.facilityId } : {}

    const [
      totalClients,
      statusCounts,
      populationCounts,
      recentEnrollments,
      activePrescriptionCounts,
      overdueTasksCount,
      todayTasksCount,
      recentEncounters,
      pendingLabsCount
    ] = await Promise.all([
      prisma.client.count({
        where: facilityFilter
      }),

      prisma.client.groupBy({
        by: ['status'],
        where: facilityFilter,
        _count: {
          status: true
        }
      }),

      prisma.$queryRaw`
        SELECT l.label as population, COUNT(*)::int as count
        FROM client_population_map m
        JOIN lookups l ON l.id = m.population_id
        JOIN clients c ON c.id = m.client_id
        ${session.facilityId ? `WHERE c.facility_id = '${session.facilityId}'` : ''}
        GROUP BY l.label
        ORDER BY count DESC
        LIMIT 10
      `,

      prisma.client.count({
        where: {
          ...facilityFilter,
          dateEnrolled: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),

      prisma.prescription.groupBy({
        by: ['category'],
        where: {
          isActive: true,
          client: facilityFilter
        },
        _count: {
          category: true
        }
      }),

      prisma.task.count({
        where: {
          status: 'OPEN',
          dueDate: {
            lt: new Date()
          },
          client: facilityFilter
        }
      }),

      prisma.task.count({
        where: {
          status: 'OPEN',
          dueDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          },
          client: facilityFilter
        }
      }),

      prisma.encounter.count({
        where: {
          date: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7))
          },
          client: facilityFilter
        }
      }),

      prisma.labPanel.count({
        where: {
          status: 'PENDING',
          client: facilityFilter
        }
      })
    ])

    const enrollmentsByMonth = await prisma.$queryRaw`
      SELECT 
        date_trunc('month', date_enrolled) as month,
        COUNT(*)::int as count
      FROM clients
      ${session.facilityId ? `WHERE facility_id = '${session.facilityId}'` : ''}
      WHERE date_enrolled >= date_trunc('month', NOW() - INTERVAL '11 months')
      GROUP BY date_trunc('month', date_enrolled)
      ORDER BY month ASC
    `

    const viralLoadStatus = await prisma.$queryRaw`
      SELECT 
        cs.viral_load_status as status,
        COUNT(*)::int as count
      FROM clinical_summaries cs
      JOIN clients c ON c.id = cs.client_id
      ${session.facilityId ? `WHERE c.facility_id = '${session.facilityId}'` : ''}
      WHERE cs.viral_load_status IS NOT NULL
      GROUP BY cs.viral_load_status
    `

    const upcomingTasks = await prisma.task.findMany({
      where: {
        status: 'OPEN',
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        client: facilityFilter
      },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            legalSurname: true,
            legalFirst: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      },
      take: 10
    })

    const dashboard = {
      overview: {
        totalClients,
        recentEnrollments,
        recentEncounters,
        pendingLabsCount
      },
      clients: {
        byStatus: statusCounts.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        byPopulation: populationCounts
      },
      prescriptions: {
        activeByCategory: activePrescriptionCounts.map(item => ({
          category: item.category,
          count: item._count.category
        }))
      },
      tasks: {
        overdue: overdueTasksCount,
        dueToday: todayTasksCount,
        upcoming: upcomingTasks
      },
      trends: {
        enrollmentsByMonth,
        viralLoadStatus
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actorType: 'USER',
        action: 'READ',
        entity: 'dashboard',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    })

    return NextResponse.json({ dashboard })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
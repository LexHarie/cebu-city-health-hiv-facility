import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, TaskType, TaskStatus } from '@cebu-health/db'
import { requireAuth } from '@cebu-health/lib/auth/sessions'
import { z } from 'zod'

const prisma = new PrismaClient()

const searchParamsSchema = z.object({
  clientId: z.string().uuid().optional(),
  type: z.enum(['FOLLOW_UP', 'REFILL_PREP', 'REFILL_ARV', 'LABS_PENDING', 'VL_MONITOR', 'STI_SCREENING', 'LTFU_REVIEW', 'ADMIN']).optional(),
  status: z.enum(['OPEN', 'DONE', 'DISMISSED']).default('OPEN'),
  assignedToRole: z.string().optional(),
  overdue: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(50)
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const params = searchParamsSchema.parse({
      clientId: searchParams.get('clientId'),
      type: searchParams.get('type'),
      status: searchParams.get('status'),
      assignedToRole: searchParams.get('assignedToRole'),
      overdue: searchParams.get('overdue'),
      limit: searchParams.get('limit')
    })

    const whereClause: {
      status: TaskStatus;
      clientId?: string;
      client?: { facilityId: string };
      type?: TaskType;
      assignedToRole?: { name: string };
      dueDate?: { lt: Date };
    } = {
      status: params.status as TaskStatus
    }

    if (params.clientId) {
      const client = await prisma.client.findFirst({
        where: {
          id: params.clientId,
          ...(session.facilityId ? { facilityId: session.facilityId } : {})
        }
      })

      if (!client) {
        return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 })
      }

      whereClause.clientId = params.clientId
    } else if (session.facilityId) {
      whereClause.client = {
        facilityId: session.facilityId
      }
    }

    if (params.type) {
      whereClause.type = params.type as TaskType
    }

    if (params.assignedToRole) {
      whereClause.assignedToRole = {
        name: params.assignedToRole
      }
    }

    if (params.overdue) {
      whereClause.dueDate = {
        lt: new Date()
      }
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            legalSurname: true,
            legalFirst: true,
            preferredName: true
          }
        },
        assignedToRole: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            displayName: true
          }
        }
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ],
      take: params.limit
    })

    const overdueCount = await prisma.task.count({
      where: {
        ...whereClause,
        dueDate: {
          lt: new Date()
        }
      }
    })

    const todayCount = await prisma.task.count({
      where: {
        ...whereClause,
        dueDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actorType: 'USER',
        action: 'READ',
        entity: 'tasks',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    })

    return NextResponse.json({ 
      tasks,
      summary: {
        overdue: overdueCount,
        dueToday: todayCount,
        total: tasks.length
      }
    })
  } catch (error) {
    console.error('GET /api/tasks error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
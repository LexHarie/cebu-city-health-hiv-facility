import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, LifecycleStatus } from '@cebu-health/db'
import { requireAuth } from '@cebu-health/lib/auth/sessions'
import { z } from 'zod'

const prisma = new PrismaClient()

const searchParamsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'TRANSFERRED_OUT', 'EXPIRED', 'LOST_TO_FOLLOW_UP', 'INACTIVE']).optional(),
  facility: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50)
})

const createClientSchema = z.object({
  clientCode: z.string().min(1),
  uic: z.string().min(1),
  philHealth: z.string().optional(),
  legalSurname: z.string().min(1),
  legalFirst: z.string().min(1),
  legalMiddle: z.string().optional(),
  suffix: z.string().optional(),
  preferredName: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  sexAtBirth: z.enum(['MALE', 'FEMALE', 'INTERSEX', 'UNKNOWN']),
  genderIdentityId: z.string().optional(),
  homeAddress: z.string().optional(),
  workAddress: z.string().optional(),
  occupation: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z.string().email().optional(),
  caseManagerId: z.string().optional(),
  notes: z.string().optional(),
  populationIds: z.array(z.string()).optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const qp = (k: string) => {
      const v = searchParams.get(k)
      return v === null ? undefined : v
    }
    const params = searchParamsSchema.parse({
      search: qp('search'),
      status: qp('status'),
      facility: qp('facility'),
      limit: qp('limit')
    })

    const whereClause: {
      facilityId?: string;
      status?: LifecycleStatus;
    } = {}
    
    if (session.facilityId && !params.facility) {
      whereClause.facilityId = session.facilityId
    } else if (params.facility) {
      whereClause.facilityId = params.facility
    }
    
    if (params.status) {
      whereClause.status = params.status as LifecycleStatus
    }

    let clients
    if (params.search) {
      const q = params.search.trim()
      clients = await prisma.client.findMany({
        where: {
          ...whereClause,
          OR: [
            { legalSurname: { contains: q, mode: 'insensitive' } },
            { legalFirst: { contains: q, mode: 'insensitive' } },
            { clientCode: { contains: q, mode: 'insensitive' } },
            { uic: { contains: q, mode: 'insensitive' } },
          ]
        },
        select: {
          id: true,
          clientCode: true,
          uic: true,
          legalSurname: true,
          legalFirst: true,
          preferredName: true,
          dateOfBirth: true,
          status: true,
          lastVisitAt: true,
          contactNumber: true
        },
        orderBy: [
          { legalSurname: 'asc' },
          { legalFirst: 'asc' }
        ],
        take: params.limit
      })
    } else {
      clients = await prisma.client.findMany({
        where: whereClause,
        select: {
          id: true,
          clientCode: true,
          uic: true,
          legalSurname: true,
          legalFirst: true,
          preferredName: true,
          dateOfBirth: true,
          status: true,
          lastVisitAt: true,
          contactNumber: true
        },
        orderBy: [
          { legalSurname: 'asc' },
          { legalFirst: 'asc' }
        ],
        take: params.limit
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actorType: 'USER',
        action: 'READ',
        entity: 'clients',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    })

    return NextResponse.json({ clients })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('GET /api/clients error:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const data = createClientSchema.parse(body)

    if (!session.facilityId) {
      return NextResponse.json({ error: 'User must be assigned to a facility' }, { status: 400 })
    }

    const existingClient = await prisma.client.findFirst({
      where: {
        OR: [
          { uic: data.uic },
          { 
            facilityId: session.facilityId,
            clientCode: data.clientCode 
          }
        ]
      }
    })

    if (existingClient) {
      return NextResponse.json({ error: 'Client with this UIC or client code already exists' }, { status: 409 })
    }

    const client = await prisma.$transaction(async (tx) => {
      const newClient = await tx.client.create({
        data: {
          facilityId: session.facilityId as string,
          currentFacilityId: session.facilityId as string,
          dateEnrolled: new Date(),
          clientCode: data.clientCode,
          uic: data.uic,
          philHealth: data.philHealth,
          legalSurname: data.legalSurname,
          legalFirst: data.legalFirst,
          legalMiddle: data.legalMiddle,
          suffix: data.suffix,
          preferredName: data.preferredName,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          sexAtBirth: data.sexAtBirth,
          genderIdentityId: data.genderIdentityId,
          homeAddress: data.homeAddress,
          workAddress: data.workAddress,
          occupation: data.occupation,
          contactNumber: data.contactNumber,
          email: data.email,
          caseManagerId: data.caseManagerId,
          notes: data.notes
        }
      })

      if (data.populationIds?.length) {
        await tx.clientPopulationMap.createMany({
          data: data.populationIds.map(populationId => ({
            clientId: newClient.id,
            populationId
          }))
        })
      }

      await tx.clinicalSummary.create({
        data: {
          clientId: newClient.id
        }
      })

      return newClient
    })

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actorType: 'USER',
        action: 'CREATE',
        entity: 'clients',
        entityId: client.id,
        after: client,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('POST /api/clients error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

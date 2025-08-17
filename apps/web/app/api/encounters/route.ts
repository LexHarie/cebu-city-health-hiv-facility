import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@cebu-health/db'
import { requireAuth } from '@cebu-health/lib/auth/sessions'
import { z } from 'zod'

const prisma = new PrismaClient()

const createEncounterSchema = z.object({
  clientId: z.string().uuid(),
  date: z.string().datetime(),
  type: z.enum(['INTAKE', 'FOLLOW_UP', 'COUNSELING', 'DISPENSE', 'LAB_COLLECTION']),
  note: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const data = createEncounterSchema.parse(body)

    const client = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        ...(session.facilityId ? { facilityId: session.facilityId } : {})
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 })
    }

    const encounter = await prisma.$transaction(async (tx) => {
      const newEncounter = await tx.encounter.create({
        data: {
          clientId: data.clientId,
          clinicianId: session.userId,
          date: new Date(data.date),
          type: data.type,
          note: data.note
        },
        include: {
          client: {
            select: {
              id: true,
              clientCode: true,
              legalSurname: true,
              legalFirst: true
            }
          },
          clinician: {
            select: {
              id: true,
              displayName: true
            }
          }
        }
      })

      await tx.client.update({
        where: { id: data.clientId },
        data: {
          lastVisitAt: new Date(data.date)
        }
      })

      return newEncounter
    })

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actorType: 'USER',
        action: 'CREATE',
        entity: 'encounters',
        entityId: encounter.id,
        after: encounter,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    })

    return NextResponse.json({ encounter }, { status: 201 })
  } catch (error) {
    console.error('POST /api/encounters error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@cebu-health/db'
import { requireAuth } from '@cebu-health/lib/auth/sessions'
import { z } from 'zod'

const prisma = new PrismaClient()

const createLabPanelSchema = z.object({
  clientId: z.string().uuid(),
  encounterId: z.string().uuid().optional(),
  panelTypeId: z.string().uuid(),
  orderedAt: z.string().datetime().optional(),
  collectedAt: z.string().datetime().optional(),
  reportedAt: z.string().datetime().optional(),
  labName: z.string().optional(),
  status: z.enum(['POSITIVE', 'NEGATIVE', 'INDETERMINATE', 'PENDING', 'NOT_DONE']).default('PENDING')
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const data = createLabPanelSchema.parse(body)

    const client = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        ...(session.facilityId ? { facilityId: session.facilityId } : {})
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 })
    }

    if (data.encounterId) {
      const encounter = await prisma.encounter.findFirst({
        where: {
          id: data.encounterId,
          clientId: data.clientId
        }
      })

      if (!encounter) {
        return NextResponse.json({ error: 'Encounter not found for this client' }, { status: 404 })
      }
    }

    const panelType = await prisma.lookup.findFirst({
      where: {
        id: data.panelTypeId,
        type: 'LAB_PANEL',
        active: true
      }
    })

    if (!panelType) {
      return NextResponse.json({ error: 'Lab panel type not found' }, { status: 404 })
    }

    const labPanel = await prisma.labPanel.create({
      data: {
        clientId: data.clientId,
        encounterId: data.encounterId,
        panelTypeId: data.panelTypeId,
        orderedAt: data.orderedAt ? new Date(data.orderedAt) : new Date(),
        collectedAt: data.collectedAt ? new Date(data.collectedAt) : null,
        reportedAt: data.reportedAt ? new Date(data.reportedAt) : null,
        labName: data.labName,
        status: data.status
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
        panelType: true,
        encounter: {
          select: {
            id: true,
            date: true,
            type: true
          }
        }
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actorType: 'USER',
        action: 'CREATE',
        entity: 'lab_panels',
        entityId: labPanel.id,
        after: labPanel,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    })

    return NextResponse.json({ labPanel }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

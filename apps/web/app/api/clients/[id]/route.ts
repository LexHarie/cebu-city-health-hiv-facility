import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@cebu-health/db'
import { requireAuth } from '@cebu-health/lib/auth/sessions'
import { z } from 'zod'

const prisma = new PrismaClient()

const updateClientSchema = z.object({
  clientCode: z.string().min(1).optional(),
  philHealth: z.string().optional(),
  legalSurname: z.string().min(1).optional(),
  legalFirst: z.string().min(1).optional(),
  legalMiddle: z.string().optional(),
  suffix: z.string().optional(),
  preferredName: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  sexAtBirth: z.enum(['MALE', 'FEMALE', 'INTERSEX', 'UNKNOWN']).optional(),
  genderIdentityId: z.string().optional(),
  homeAddress: z.string().optional(),
  workAddress: z.string().optional(),
  occupation: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z.string().email().optional(),
  caseManagerId: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'TRANSFERRED_OUT', 'EXPIRED', 'LOST_TO_FOLLOW_UP', 'INACTIVE']).optional(),
  populationIds: z.array(z.string()).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const client = await prisma.client.findFirst({
      where: {
        id,
        ...(session.facilityId ? { facilityId: session.facilityId } : {})
      },
      include: {
        facility: true,
        currentFacility: true,
        caseManager: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        },
        genderIdentity: true,
        clinicalSummary: {
          include: {
            currentArvRegimen: true,
            currentPrepRegimen: true
          }
        },
        populations: {
          include: {
            population: true
          }
        },
        tasks: {
          where: {
            status: 'OPEN'
          },
          orderBy: {
            dueDate: 'asc'
          },
          take: 10
        },
        encounters: {
          orderBy: {
            date: 'desc'
          },
          take: 5,
          include: {
            clinician: {
              select: {
                id: true,
                displayName: true
              }
            }
          }
        },
        labPanels: {
          orderBy: {
            reportedAt: 'desc'
          },
          take: 10,
          include: {
            panelType: true,
            results: {
              include: {
                testType: true
              }
            }
          }
        },
        prescriptions: {
          where: {
            isActive: true
          },
          include: {
            regimen: true,
            medication: true,
            prescriber: {
              select: {
                id: true,
                displayName: true
              }
            }
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actorType: 'USER',
        action: 'READ',
        entity: 'clients',
        entityId: client.id,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    })

    return NextResponse.json({ client })
  } catch (error) {
    console.error('GET /api/clients/[id] error:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const data = updateClientSchema.parse(body)

    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        ...(session.facilityId ? { facilityId: session.facilityId } : {})
      }
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (data.clientCode && data.clientCode !== existingClient.clientCode) {
      const codeExists = await prisma.client.findFirst({
        where: {
          facilityId: existingClient.facilityId,
          clientCode: data.clientCode,
          id: { not: id }
        }
      })
      if (codeExists) {
        return NextResponse.json({ error: 'Client code already exists in this facility' }, { status: 409 })
      }
    }

    const updatedClient = await prisma.$transaction(async (tx) => {
      const client = await tx.client.update({
        where: { id },
        data: {
          ...(data.clientCode && { clientCode: data.clientCode }),
          ...(data.philHealth !== undefined && { philHealth: data.philHealth }),
          ...(data.legalSurname && { legalSurname: data.legalSurname }),
          ...(data.legalFirst && { legalFirst: data.legalFirst }),
          ...(data.legalMiddle !== undefined && { legalMiddle: data.legalMiddle }),
          ...(data.suffix !== undefined && { suffix: data.suffix }),
          ...(data.preferredName !== undefined && { preferredName: data.preferredName }),
          ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null }),
          ...(data.sexAtBirth && { sexAtBirth: data.sexAtBirth }),
          ...(data.genderIdentityId !== undefined && { genderIdentityId: data.genderIdentityId }),
          ...(data.homeAddress !== undefined && { homeAddress: data.homeAddress }),
          ...(data.workAddress !== undefined && { workAddress: data.workAddress }),
          ...(data.occupation !== undefined && { occupation: data.occupation }),
          ...(data.contactNumber !== undefined && { contactNumber: data.contactNumber }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.caseManagerId !== undefined && { caseManagerId: data.caseManagerId }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.status && { status: data.status })
        }
      })

      if (data.populationIds) {
        await tx.clientPopulationMap.deleteMany({
          where: { clientId: id }
        })
        if (data.populationIds.length > 0) {
          await tx.clientPopulationMap.createMany({
            data: data.populationIds.map(populationId => ({
              clientId: id,
              populationId
            }))
          })
        }
      }

      return client
    })

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actorType: 'USER',
        action: 'UPDATE',
        entity: 'clients',
        entityId: id,
        before: existingClient,
        after: updatedClient,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    })

    return NextResponse.json({ client: updatedClient })
  } catch (error) {
    console.error('PATCH /api/clients/[id] error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
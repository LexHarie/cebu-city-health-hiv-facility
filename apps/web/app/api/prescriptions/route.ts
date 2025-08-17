import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, MedicationCategory } from '@cebu-health/db'
import { requireAuth } from '@cebu-health/lib/auth/sessions'
import { z } from 'zod'

const prisma = new PrismaClient()

const searchParamsSchema = z.object({
  clientId: z.string().uuid().optional(),
  category: z.enum(['ARV', 'PREP', 'TB_PROPHYLAXIS', 'STI', 'OTHER']).optional(),
  isActive: z.coerce.boolean().default(true),
  limit: z.coerce.number().min(1).max(100).default(50)
})

const createPrescriptionSchema = z.object({
  clientId: z.string().uuid(),
  regimenId: z.string().uuid().optional(),
  medicationId: z.string().uuid().optional(),
  category: z.enum(['ARV', 'PREP', 'TB_PROPHYLAXIS', 'STI', 'OTHER']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  instructions: z.string().optional(),
  reasonChange: z.string().optional()
}).refine(data => data.regimenId || data.medicationId, {
  message: "Either regimenId or medicationId must be provided"
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const params = searchParamsSchema.parse({
      clientId: searchParams.get('clientId'),
      category: searchParams.get('category'),
      isActive: searchParams.get('isActive'),
      limit: searchParams.get('limit')
    })

    const whereClause: {
      isActive: boolean;
      clientId?: string;
      client?: { facilityId: string };
      category?: MedicationCategory;
    } = {
      isActive: params.isActive
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

    if (params.category) {
      whereClause.category = params.category as MedicationCategory
    }

    const prescriptions = await prisma.prescription.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            legalSurname: true,
            legalFirst: true
          }
        },
        regimen: true,
        medication: true,
        prescriber: {
          select: {
            id: true,
            displayName: true
          }
        },
        dispenses: {
          orderBy: {
            dispensedAt: 'desc'
          },
          take: 3
        }
      },
      orderBy: {
        startDate: 'desc'
      },
      take: params.limit
    })

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actorType: 'USER',
        action: 'READ',
        entity: 'prescriptions',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    })

    return NextResponse.json({ prescriptions })
  } catch (error) {
    console.error('GET /api/prescriptions error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
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
    const data = createPrescriptionSchema.parse(body)

    const client = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        ...(session.facilityId ? { facilityId: session.facilityId } : {})
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 })
    }

    if (data.regimenId) {
      const regimen = await prisma.regimen.findFirst({
        where: {
          id: data.regimenId,
          active: true,
          category: data.category
        }
      })

      if (!regimen) {
        return NextResponse.json({ error: 'Regimen not found or category mismatch' }, { status: 404 })
      }
    }

    if (data.medicationId) {
      const medication = await prisma.medication.findFirst({
        where: {
          id: data.medicationId,
          active: true,
          category: data.category
        }
      })

      if (!medication) {
        return NextResponse.json({ error: 'Medication not found or category mismatch' }, { status: 404 })
      }
    }

    const prescription = await prisma.$transaction(async (tx) => {
      if (data.category === 'ARV' || data.category === 'PREP') {
        await tx.prescription.updateMany({
          where: {
            clientId: data.clientId,
            category: data.category,
            isActive: true
          },
          data: {
            isActive: false,
            endDate: new Date()
          }
        })
      }

      const newPrescription = await tx.prescription.create({
        data: {
          clientId: data.clientId,
          regimenId: data.regimenId,
          medicationId: data.medicationId,
          category: data.category,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          prescriberId: session.userId,
          instructions: data.instructions,
          reasonChange: data.reasonChange
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
          regimen: true,
          medication: true,
          prescriber: {
            select: {
              id: true,
              displayName: true
            }
          }
        }
      })

      if (data.category === 'ARV') {
        await tx.clinicalSummary.update({
          where: { clientId: data.clientId },
          data: {
            currentArvRegimenId: data.regimenId
          }
        })
      } else if (data.category === 'PREP') {
        await tx.clinicalSummary.update({
          where: { clientId: data.clientId },
          data: {
            currentPrepRegimenId: data.regimenId
          }
        })
      }

      return newPrescription
    })

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actorType: 'USER',
        action: 'CREATE',
        entity: 'prescriptions',
        entityId: prescription.id,
        after: prescription,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    })

    return NextResponse.json({ prescription }, { status: 201 })
  } catch (error) {
    console.error('POST /api/prescriptions error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
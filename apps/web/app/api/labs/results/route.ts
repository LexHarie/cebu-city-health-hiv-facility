import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@cebu-health/db'
import { requireAuth } from '@cebu-health/lib/auth/sessions'
import { z } from 'zod'

const prisma = new PrismaClient()

const createLabResultSchema = z.object({
  panelId: z.string().uuid(),
  testTypeId: z.string().uuid(),
  valueNum: z.number().optional(),
  valueText: z.string().optional(),
  unit: z.string().optional(),
  refLow: z.number().optional(),
  refHigh: z.number().optional(),
  abnormal: z.boolean().optional()
}).refine(data => data.valueNum !== undefined || data.valueText !== undefined, {
  message: "Either valueNum or valueText must be provided"
})

const bulkCreateLabResultsSchema = z.object({
  panelId: z.string().uuid(),
  results: z.array(z.object({
    testTypeId: z.string().uuid(),
    valueNum: z.number().optional(),
    valueText: z.string().optional(),
    unit: z.string().optional(),
    refLow: z.number().optional(),
    refHigh: z.number().optional(),
    abnormal: z.boolean().optional()
  }).refine(data => data.valueNum !== undefined || data.valueText !== undefined, {
    message: "Either valueNum or valueText must be provided"
  }))
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    
    const isBulkCreate = Array.isArray(body.results)
    
    if (isBulkCreate) {
      const data = bulkCreateLabResultsSchema.parse(body)
      
      const labPanel = await prisma.labPanel.findFirst({
        where: {
          id: data.panelId
        },
        include: {
          client: {
            select: {
              id: true,
              facilityId: true
            }
          }
        }
      })

      if (!labPanel) {
        return NextResponse.json({ error: 'Lab panel not found' }, { status: 404 })
      }

      if (session.facilityId && labPanel.client.facilityId !== session.facilityId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      const testTypeIds = data.results.map(r => r.testTypeId)
      const testTypes = await prisma.lookup.findMany({
        where: {
          id: { in: testTypeIds },
          type: 'LAB_TEST',
          active: true
        }
      })

      if (testTypes.length !== testTypeIds.length) {
        return NextResponse.json({ error: 'One or more test types not found' }, { status: 404 })
      }

      const labResults = await prisma.$transaction(async (tx) => {
        const results = await Promise.all(
          data.results.map(result => 
            tx.labResult.create({
              data: {
                panelId: data.panelId,
                testTypeId: result.testTypeId,
                valueNum: result.valueNum,
                valueText: result.valueText,
                unit: result.unit,
                refLow: result.refLow,
                refHigh: result.refHigh,
                abnormal: result.abnormal
              },
              include: {
                testType: true
              }
            })
          )
        )

        await tx.labPanel.update({
          where: { id: data.panelId },
          data: {
            reportedAt: new Date(),
            status: 'PENDING'
          }
        })

        return results
      })

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          actorType: 'USER',
          action: 'CREATE',
          entity: 'lab_results',
          after: labResults,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent')
        }
      })

      return NextResponse.json({ labResults }, { status: 201 })
    } else {
      const data = createLabResultSchema.parse(body)

      const labPanel = await prisma.labPanel.findFirst({
        where: {
          id: data.panelId
        },
        include: {
          client: {
            select: {
              id: true,
              facilityId: true
            }
          }
        }
      })

      if (!labPanel) {
        return NextResponse.json({ error: 'Lab panel not found' }, { status: 404 })
      }

      if (session.facilityId && labPanel.client.facilityId !== session.facilityId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      const testType = await prisma.lookup.findFirst({
        where: {
          id: data.testTypeId,
          type: 'LAB_TEST',
          active: true
        }
      })

      if (!testType) {
        return NextResponse.json({ error: 'Lab test type not found' }, { status: 404 })
      }

      const labResult = await prisma.labResult.create({
        data: {
          panelId: data.panelId,
          testTypeId: data.testTypeId,
          valueNum: data.valueNum,
          valueText: data.valueText,
          unit: data.unit,
          refLow: data.refLow,
          refHigh: data.refHigh,
          abnormal: data.abnormal
        },
        include: {
          panel: {
            include: {
              client: {
                select: {
                  id: true,
                  clientCode: true,
                  legalSurname: true,
                  legalFirst: true
                }
              },
              panelType: true
            }
          },
          testType: true
        }
      })

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          actorType: 'USER',
          action: 'CREATE',
          entity: 'lab_results',
          entityId: labResult.id,
          after: labResult,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent')
        }
      })

      return NextResponse.json({ labResult }, { status: 201 })
    }
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

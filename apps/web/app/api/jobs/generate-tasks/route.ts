import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, TaskType, type Prisma } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.$transaction(async (tx) => {
      await generateLTFUTasks(tx)
      await generateLabTasks(tx)
      await generateRefillTasks(tx)
      await generateVLMonitorTasks(tx)
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Tasks generated successfully'
    })

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error generating tasks:', error)
    return NextResponse.json(
      { error: 'Failed to generate tasks' },
      { status: 500 }
    )
  }
}

async function generateLTFUTasks(tx: Prisma.TransactionClient) {
  const ltfuDate = new Date()
  ltfuDate.setDate(ltfuDate.getDate() - 90)

  const ltfuClients = await tx.$queryRaw`
    SELECT DISTINCT c.id, c.client_code, c.legal_surname, c.legal_first_name
    FROM clients c
    LEFT JOIN encounters e ON e.client_id = c.id AND e.date > ${ltfuDate}
    LEFT JOIN prescriptions p ON p.client_id = c.id
    LEFT JOIN dispenses d ON d.prescription_id = p.id AND d.dispensed_at > ${ltfuDate}
    WHERE c.status = 'ACTIVE'
      AND e.id IS NULL
      AND d.id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM tasks t 
        WHERE t.client_id = c.id 
          AND t.type = 'LTFU_REVIEW' 
          AND t.status = 'OPEN'
      )
  `

  for (const client of ltfuClients as Array<{id: string; client_code: string; legal_surname: string; legal_first_name: string}>) {
    await tx.task.create({
      data: {
        clientId: client.id,
        type: 'LTFU_REVIEW' as TaskType,
        title: `LTFU Review: ${client.legal_surname}, ${client.legal_first_name}`,
        dueDate: new Date(),
        payload: {
          clientCode: client.client_code,
          lastVisitThreshold: ltfuDate.toISOString()
        }
      }
    })
  }
}

async function generateLabTasks(tx: Prisma.TransactionClient) {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const clientsMissingVL = await tx.$queryRaw`
    SELECT c.id, c.client_code, c.legal_surname, c.legal_first_name
    FROM clients c
    JOIN prescriptions p ON p.client_id = c.id
    WHERE c.status = 'ACTIVE'
      AND p.category = 'ARV'
      AND p.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM lab_panels lp
        JOIN lookups l ON l.id = lp.panel_type_id
        WHERE l.type = 'LAB_PANEL'
          AND l.code = 'HIV_VL'
          AND lp.client_id = c.id
          AND lp.reported_at > ${sixMonthsAgo}
      )
      AND NOT EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.client_id = c.id
          AND t.type = 'LABS_PENDING'
          AND t.status = 'OPEN'
          AND t.payload::jsonb ? 'HIV_VL'
      )
  `

  for (const client of clientsMissingVL as Array<{id: string; client_code: string; legal_surname: string; legal_first_name: string}>) {
    await tx.task.create({
      data: {
        clientId: client.id,
        type: 'LABS_PENDING' as TaskType,
        title: `HIV Viral Load Due: ${client.legal_surname}, ${client.legal_first_name}`,
        dueDate: new Date(),
        payload: {
          clientCode: client.client_code,
          missingLabs: ['HIV_VL'],
          reason: 'Six-month monitoring requirement'
        }
      }
    })
  }
}

async function generateRefillTasks(tx: Prisma.TransactionClient) {
  const threeDaysFromNow = new Date()
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  const upcomingRefills = await tx.dispense.findMany({
    where: {
      nextRefillDate: {
        lte: threeDaysFromNow,
        gte: new Date()
      }
    },
    include: {
      prescription: {
        include: {
          client: true,
          regimen: true
        }
      }
    }
  })

  for (const dispense of upcomingRefills) {
    const existingTask = await tx.task.findFirst({
      where: {
        clientId: dispense.prescription.clientId,
        type: dispense.prescription.category === 'ARV' ? 'REFILL_ARV' : 'REFILL_PREP',
        status: 'OPEN',
        payload: {
          path: ['prescriptionId'],
          equals: dispense.prescriptionId
        }
      }
    })

    if (!existingTask) {
      await tx.task.create({
        data: {
          clientId: dispense.prescription.clientId,
          type: (dispense.prescription.category === 'ARV' ? 'REFILL_ARV' : 'REFILL_PREP') as TaskType,
          title: `${dispense.prescription.category} Refill Due: ${dispense.prescription.client.legalSurname}, ${dispense.prescription.client.legalFirst}`,
          dueDate: dispense.nextRefillDate,
          payload: {
            prescriptionId: dispense.prescriptionId,
            regimenName: dispense.prescription.regimen?.name,
            daysSupply: dispense.daysSupply
          }
        }
      })
    }
  }
}

async function generateVLMonitorTasks(tx: Prisma.TransactionClient) {
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

  const clientsNeedingVLMonitor = await tx.$queryRaw`
    SELECT c.id, c.client_code, c.legal_surname, c.legal_first_name
    FROM clients c
    JOIN prescriptions p ON p.client_id = c.id
    WHERE c.status = 'ACTIVE'
      AND p.category = 'ARV'
      AND p.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM lab_panels lp
        JOIN lookups l ON l.id = lp.panel_type_id
        WHERE l.type = 'LAB_PANEL'
          AND l.code = 'HIV_VL'
          AND lp.client_id = c.id
          AND lp.reported_at > ${twelveMonthsAgo}
      )
      AND NOT EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.client_id = c.id
          AND t.type = 'VL_MONITOR'
          AND t.status = 'OPEN'
      )
  `

  for (const client of clientsNeedingVLMonitor as Array<{id: string; client_code: string; legal_surname: string; legal_first_name: string}>) {
    await tx.task.create({
      data: {
        clientId: client.id,
        type: 'VL_MONITOR' as TaskType,
        title: `VL Monitoring Due: ${client.legal_surname}, ${client.legal_first_name}`,
        dueDate: new Date(),
        payload: {
          clientCode: client.client_code,
          reason: 'Annual monitoring requirement'
        }
      }
    })
  }
}
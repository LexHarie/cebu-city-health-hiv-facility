import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, ViralLoadStatus } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.$transaction(async (tx) => {
      const clients = await tx.client.findMany({
        select: { id: true }
      })

      for (const client of clients) {
        await refreshClientSummary(tx, client.id)
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Clinical summaries refreshed successfully'
    })

  } catch (error) {
    console.error('Error refreshing summaries:', error)
    return NextResponse.json(
      { error: 'Failed to refresh summaries' },
      { status: 500 }
    )
  }
}

async function refreshClientSummary(tx: any, clientId: string) {
  const baselineCD4 = await tx.$queryRaw`
    SELECT lr.value_num as cd4, lp.reported_at
    FROM lab_panels lp
    JOIN lab_results lr ON lr.panel_id = lp.id
    JOIN lookups p ON p.id = lp.panel_type_id 
    WHERE p.type = 'LAB_PANEL' 
      AND p.code = 'CD4'
      AND lp.client_id = ${clientId}
      AND lp.status = 'POSITIVE'
    ORDER BY lp.reported_at ASC
    LIMIT 1
  `

  const latestVL = await tx.$queryRaw`
    SELECT lr.value_num as vl, lp.reported_at
    FROM lab_panels lp
    JOIN lab_results lr ON lr.panel_id = lp.id
    JOIN lookups p ON p.id = lp.panel_type_id
    WHERE p.type = 'LAB_PANEL'
      AND p.code = 'HIV_VL'
      AND lp.client_id = ${clientId}
      AND lp.status = 'POSITIVE'
    ORDER BY lp.reported_at DESC
    LIMIT 1
  `

  const firstVL = await tx.$queryRaw`
    SELECT MIN(lp.reported_at) as first_vl_date
    FROM lab_panels lp
    JOIN lookups p ON p.id = lp.panel_type_id
    WHERE p.type = 'LAB_PANEL'
      AND p.code = 'HIV_VL'
      AND lp.client_id = ${clientId}
      AND lp.status = 'POSITIVE'
  `

  const currentARV = await tx.prescription.findFirst({
    where: {
      clientId,
      category: 'ARV',
      isActive: true,
      OR: [
        { endDate: null },
        { endDate: { gt: new Date() } }
      ]
    },
    include: { regimen: true }
  })

  const currentPrEP = await tx.prescription.findFirst({
    where: {
      clientId,
      category: 'PREP',
      isActive: true,
      OR: [
        { endDate: null },
        { endDate: { gt: new Date() } }
      ]
    },
    include: { regimen: true }
  })

  let viralLoadStatus: ViralLoadStatus = 'PENDING'
  if (latestVL[0]?.vl !== undefined) {
    const vl = latestVL[0].vl
    if (vl < 50) viralLoadStatus = 'UNDETECTABLE'
    else if (vl < 1000) viralLoadStatus = 'SUPPRESSED'
    else viralLoadStatus = 'DETECTABLE'
  }

  await tx.clinicalSummary.upsert({
    where: { clientId },
    create: {
      clientId,
      baselineCd4: baselineCD4[0]?.cd4 || null,
      baselineCd4Date: baselineCD4[0]?.reported_at || null,
      firstViralLoadDate: firstVL[0]?.first_vl_date || null,
      viralLoadStatus,
      currentArvRegimenId: currentARV?.regimenId || null,
      currentPrepRegimenId: currentPrEP?.regimenId || null
    },
    update: {
      baselineCd4: baselineCD4[0]?.cd4 || null,
      baselineCd4Date: baselineCD4[0]?.reported_at || null,
      firstViralLoadDate: firstVL[0]?.first_vl_date || null,
      viralLoadStatus,
      currentArvRegimenId: currentARV?.regimenId || null,
      currentPrepRegimenId: currentPrEP?.regimenId || null
    }
  })
}
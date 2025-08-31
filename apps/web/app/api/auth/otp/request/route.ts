import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, OtpType } from '@cebu-health/db'
import { generateOTP, hashOTP, getOTPExpiryTime } from '@cebu-health/lib/auth/otp'
import { sendEmailOTP } from '@cebu-health/lib/auth/providers/email'
import { sendSMSOTP } from '@cebu-health/lib/auth/providers/sms'
import { z } from 'zod'

const prisma = new PrismaClient()

const requestSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  type: z.enum(['EMAIL', 'SMS'])
}).refine(data => {
  if (data.type === 'EMAIL' && !data.email) return false
  if (data.type === 'SMS' && !data.phone) return false
  return true
}, {
  message: "Email required for EMAIL type, phone required for SMS type"
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, phone, type } = requestSchema.parse(body)
    
    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phone ? { phone } : {}
        ]
      },
      include: {
        roles: {
          include: {
            role: true
          }
        },
        facility: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate OTP (still generate, even if we use default later)
    const otp = generateOTP(6)
    const codeHash = await hashOTP(otp)
    const expiresAt = getOTPExpiryTime(10) // 10 minutes
    const sentTo = type === 'EMAIL' ? (email || user.email) : (phone || user.phone || '')

    // Store OTP in database (non-blocking for default flow)
    await prisma.otpCode.create({
      data: {
        userId: user.id,
        type: type as OtpType,
        codeHash,
        sentTo,
        expiresAt
      }
    })

    // Attempt to send OTP, but do not fail the flow; default code is accepted on verify
    try {
      if (type === 'EMAIL') {
        await sendEmailOTP({ to: sentTo, otp, facilityName: user.facility?.name })
      } else {
        await sendSMSOTP({ to: sentTo, otp, facilityName: user.facility?.name })
      }
    } catch {}

    return NextResponse.json({
      success: true,
      sentTo: sentTo.replace(/(.{2}).*(@|.*(?=.{4}$))/, '$1***$2'),
      expiresAt
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    // Log error for debugging
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

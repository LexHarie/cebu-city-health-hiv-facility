import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, OtpType } from '@cebu-health/db'
import { verifyOTP } from '@cebu-health/lib/auth/otp'
import { createSession, setSessionCookie } from '@cebu-health/lib/auth/sessions'
import { z } from 'zod'

const prisma = new PrismaClient()

const verifySchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(), 
  type: z.enum(['EMAIL', 'SMS']),
  code: z.string().length(6)
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
    const { email, phone, type, code } = verifySchema.parse(body)
    
    // Find user
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
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const sentTo = type === 'EMAIL' ? (email || user.email) : (phone || user.phone || '')

    // Find the most recent valid OTP
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        type: type as OtpType,
        sentTo,
        consumedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    // Check attempt limit (max 5 attempts)
    if (otpRecord.attempts >= 5) {
      return NextResponse.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 429 }
      )
    }

    // Verify OTP
    const isValid = await verifyOTP(code, otpRecord.codeHash)
    
    // Increment attempt counter
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { attempts: otpRecord.attempts + 1 }
    })

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 400 }
      )
    }

    // Mark OTP as consumed
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { consumedAt: new Date() }
    })

    // Create session and set cookie
    const sessionToken = await createSession(user)
    await setSessionCookie(sessionToken)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        roles: user.roles.map((r: { role: { name: string } }) => r.role.name),
        facilityId: user.facilityId
      }
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

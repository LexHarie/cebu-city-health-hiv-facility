import { SignJWT, jwtVerify } from 'jose'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key')
const SESSION_COOKIE = 'cebu-health-session'

export interface SessionData {
  userId: string
  email: string
  roles: string[]
  facilityId?: string
}

export async function createSession(user: { 
  id: string; 
  email: string; 
  facilityId?: string | null;
  roles: { role: { name: string } }[] 
}): Promise<string> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      expiresAt
    }
  })

  const sessionData: SessionData = {
    userId: user.id,
    email: user.email,
    roles: user.roles.map(r => r.role.name),
    facilityId: user.facilityId || undefined
  }

  const token = await new SignJWT({ ...sessionData, sessionId: session.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  return token
}

export async function getSession(cookieStore?: ReturnType<typeof import('next/headers').cookies>): Promise<SessionData | null> {
  try {
    let token: string | undefined
    
    if (cookieStore) {
      token = (await cookieStore).get(SESSION_COOKIE)?.value
    } else {
      // Server-side usage
      const { cookies } = await import('next/headers')
      token = (await cookies()).get(SESSION_COOKIE)?.value
    }

    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token, JWT_SECRET)
    
    // Verify session exists in database
    const session = await prisma.session.findFirst({
      where: {
        id: payload.sessionId as string,
        expiresAt: { gt: new Date() }
      }
    })

    if (!session) {
      return null
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      roles: payload.roles as string[],
      facilityId: payload.facilityId as string | undefined
    }
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string) {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
}

export async function clearSession() {
  try {
    const session = await getSession()
    
    if (session) {
      // Invalidate session in database
      await prisma.session.deleteMany({
        where: { userId: session.userId }
      })
    }
    
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
  } catch (error) {
    console.error('Error clearing session:', error)
  }
}

export async function requireAuth(): Promise<SessionData> {
  const isDev = process.env.NODE_ENV === 'development'
  const bypass = process.env.BYPASS_AUTH === 'true' || process.env.DEV_MODE === 'true'
  if (isDev && bypass) {
    const email = process.env.DEV_USER_EMAIL || 'lexthegreat223@gmail.com'
    try {
      let user = await prisma.user.findFirst({
        where: { email },
        include: { roles: { include: { role: true } } }
      })
      if (!user) {
        // Ensure facility and role exist
        const facility = await prisma.facility.findFirst({ where: { code: 'CCHD' } })
        const role = await prisma.role.findFirst({ where: { name: 'DIRECTOR' } })
        user = await prisma.user.create({
          data: {
            email,
            displayName: 'Dev User',
            phone: '+639171234566',
            facilityId: facility?.id || null,
            roles: role ? {
              create: [{ roleId: role.id }]
            } : undefined,
          },
          include: { roles: { include: { role: true } } }
        })
      }
      return {
        userId: user.id,
        email: user.email,
        roles: user.roles.map(r => r.role.name),
        facilityId: user.facilityId || undefined
      }
    } catch {
      // fallback below
    }
    return {
      userId: process.env.DEV_USER_ID || 'dev-user-id',
      email,
      roles: ['DIRECTOR'],
      facilityId: process.env.DEV_FACILITY_ID,
    }
  }

  const session = await getSession()
  if (!session) {
    throw new Error('Authentication required')
  }
  return session
}

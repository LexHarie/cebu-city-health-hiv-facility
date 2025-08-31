import { jwtVerify } from 'jose'
import type { SessionData } from './sessions'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key')

export async function decodeSessionToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      roles: (payload.roles as string[]) || [],
      facilityId: (payload.facilityId as string | undefined) || undefined,
    }
  } catch {
    return null
  }
}


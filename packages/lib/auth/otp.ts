import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'

export function generateOTP(length: number = 6): string {
  const digits = '0123456789'
  let otp = ''
  
  for (let i = 0; i < length; i++) {
    const randomByte = randomBytes(1)[0]
    if (randomByte === undefined) {
      throw new Error('Failed to generate random bytes')
    }
    const randomIndex = randomByte % digits.length
    otp += digits[randomIndex]
  }
  
  return otp
}

export async function hashOTP(otp: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(otp, saltRounds)
}

export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash)
}

export function isOTPExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

export function getOTPExpiryTime(minutes: number = 10): Date {
  const expiry = new Date()
  expiry.setMinutes(expiry.getMinutes() + minutes)
  return expiry
}
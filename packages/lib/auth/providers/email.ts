import { Resend } from 'resend'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is required')
  }
  return new Resend(apiKey)
}

export interface EmailOTPOptions {
  to: string
  otp: string
  facilityName?: string
}

export async function sendEmailOTP({ to, otp, facilityName = 'HIV Care Portal' }: EmailOTPOptions) {
  try {
    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@health.cebu.gov.ph',
      to: [to],
      subject: `${facilityName} - Authentication Code`,
      html: `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #D4AF37; font-size: 24px; margin: 0;">${facilityName}</h1>
            <p style="color: #666; margin: 5px 0 0 0;">HIV Prevention & Care Management</p>
          </div>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0 0 10px 0;">Your Authentication Code</h2>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 32px; font-weight: 600; color: #D4AF37; letter-spacing: 8px; margin: 15px 0;">
              ${otp}
            </div>
            <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">This code expires in 10 minutes</p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>Security Notice:</strong> This code is for accessing sensitive health information. 
              Do not share this code with anyone.
            </p>
          </div>
          
          <p style="color: #999; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
            If you did not request this code, please ignore this email.
          </p>
        </div>
      `
    })

    if (error) {
      console.error('Email OTP send error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('Email OTP send exception:', error)
    return { success: false, error: 'Failed to send email' }
  }
}
import twilio from 'twilio'

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  
  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables are required')
  }
  
  return twilio(accountSid, authToken)
}

export interface SMSOTPOptions {
  to: string
  otp: string
  facilityName?: string
}

export async function sendSMSOTP({ to, otp, facilityName = 'HIV Care Portal' }: SMSOTPOptions) {
  try {
    const client = getTwilioClient()
    const message = await client.messages.create({
      body: `${facilityName} Authentication Code: ${otp}. This code expires in 10 minutes. Do not share this code.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    })

    return { success: true, messageId: message.sid }
  } catch (error) {
    // Log error for debugging
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send SMS' 
    }
  }
}
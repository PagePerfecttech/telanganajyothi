import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    // Mock OTP: store "1234" as the OTP code in settings
    await db.setting.upsert({
      where: { key: 'otp_code' },
      update: { value: '1234' },
      create: { key: 'otp_code', value: '1234' },
    })

    return NextResponse.json({ success: true, message: 'OTP sent successfully' })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

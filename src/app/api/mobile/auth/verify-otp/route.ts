import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { phone, otp } = await request.json()

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 })
    }

    const setting = await db.setting.findUnique({ where: { key: 'otp_code' } })
    const validOtp = setting?.value || '1234'

    if (otp !== validOtp) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 })
    }

    // Find or create user
    let user = await db.user.findUnique({ where: { phone } })
    if (!user) {
      user = await db.user.create({ data: { phone } })
    }

    const token = Buffer.from(`${user.id}:${phone}:${Date.now()}`).toString('base64')

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        preferredLanguage: user.preferredLanguage,
      },
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

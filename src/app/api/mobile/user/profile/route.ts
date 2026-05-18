import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = Buffer.from(token, 'base64').toString()
    const [userId] = decoded.split(':')

    const data = await request.json()

    const user = await db.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        stateId: data.stateId,
        districtId: data.districtId,
        preferredLanguage: data.preferredLanguage,
        avatar: data.avatar,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

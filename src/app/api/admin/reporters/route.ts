import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const reporters = await db.reporter.findMany({
      where: { deletedAt: null },
      include: {
        state: { select: { name: true } },
        district: { select: { name: true } },
        _count: { select: { news: { where: { deletedAt: null } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(reporters)
  } catch (error) {
    console.error('Reporters list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const reporter = await db.reporter.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        avatar: data.avatar || null,
        bio: data.bio || null,
        stateId: data.stateId,
        districtId: data.districtId,
        beat: data.beat || null,
        status: data.status || 'pending',
        canPublishDirectly: data.canPublishDirectly || false,
      },
    })
    return NextResponse.json(reporter, { status: 201 })
  } catch (error) {
    console.error('Reporter create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

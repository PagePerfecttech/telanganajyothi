import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stateId = searchParams.get('stateId')

    const where: Record<string, unknown> = { deletedAt: null }
    if (stateId) where.stateId = stateId

    const districts = await db.district.findMany({
      where,
      include: {
        state: { select: { name: true, code: true } },
        _count: { select: { news: { where: { deletedAt: null } } } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(districts)
  } catch (error) {
    console.error('Districts list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    if (Array.isArray(data)) {
      const districts = await db.district.createMany({ data: data.map((d: { name: string; stateId: string; isActive?: boolean }) => ({ name: d.name, stateId: d.stateId, isActive: d.isActive ?? true })) })
      return NextResponse.json(districts, { status: 201 })
    }

    const district = await db.district.create({
      data: {
        name: data.name,
        stateId: data.stateId,
        isActive: data.isActive ?? true,
      },
    })
    return NextResponse.json(district, { status: 201 })
  } catch (error) {
    console.error('District create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

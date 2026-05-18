import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const states = await db.state.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { districts: { where: { deletedAt: null } }, news: { where: { deletedAt: null } } } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(states)
  } catch (error) {
    console.error('States list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const state = await db.state.create({
      data: {
        name: data.name,
        code: data.code,
        isActive: data.isActive ?? true,
      },
    })
    return NextResponse.json(state, { status: 201 })
  } catch (error) {
    console.error('State create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

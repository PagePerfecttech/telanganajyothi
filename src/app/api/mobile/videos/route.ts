import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const [videos, total] = await Promise.all([
      db.video.findMany({
        where: { status: 'published', deletedAt: null },
        include: { 
          category: { select: { name: true, color: true } },
          _count: { select: { reactions: { where: { type: 'like' } } } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.video.count({ where: { status: 'published', deletedAt: null } }),
    ])

    return NextResponse.json({ videos, total, page, limit })
  } catch (error) {
    console.error('Videos error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

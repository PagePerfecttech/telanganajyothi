import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const breaking = await db.news.findMany({
      where: {
        priority: 'breaking',
        status: 'published',
        deletedAt: null,
        publishedAt: { gte: twentyFourHoursAgo },
      },
      select: {
        id: true,
        title: true,
        shortDesc: true,
        thumbnailUrl: true,
        publishedAt: true,
        expiresAt: true,
        category: { select: { name: true, color: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    })

    return NextResponse.json(breaking)
  } catch (error) {
    console.error('Breaking news error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

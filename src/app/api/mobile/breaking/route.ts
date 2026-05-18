import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const breaking = await db.news.findMany({
      where: {
        priority: 'breaking',
        status: 'published',
        deletedAt: null,
        expiresAt: { gte: new Date() },
      },
      select: {
        id: true,
        titleEn: true,
        titleTe: true,
        shortDescEn: true,
        shortDescTe: true,
        thumbnailUrl: true,
        publishedAt: true,
        expiresAt: true,
        category: { select: { nameEn: true, nameTe: true, color: true } },
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

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title') || ''

    if (!title || title.trim().length < 4) {
      return NextResponse.json({ isDuplicate: false, matches: [] })
    }

    const cleanTitle = title.trim();
    const words = cleanTitle.split(/\s+/).filter(w => w.length > 2).slice(0, 5);

    if (words.length === 0) {
      return NextResponse.json({ isDuplicate: false, matches: [] })
    }

    // Search for articles containing matching keywords
    const matches = await db.news.findMany({
      where: {
        deletedAt: null,
        OR: words.map(word => ({
          title: { contains: word, mode: 'insensitive' }
        }))
      },
      take: 5,
      select: {
        id: true,
        title: true,
        shortDesc: true,
        publishedAt: true,
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const isDuplicate = matches.length > 0;

    return NextResponse.json({
      isDuplicate,
      message: isDuplicate ? 'Similar news articles found!' : 'No duplicate news found.',
      matches,
    })
  } catch (error) {
    console.error('Check duplicate news error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

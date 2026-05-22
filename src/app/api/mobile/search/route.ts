import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ results: [], total: 0, page, limit })
    }

    const searchTerm = q.trim()

    const [results, total] = await Promise.all([
      db.news.findMany({
        where: {
          status: 'published',
          deletedAt: null,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { shortDesc: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          shortDesc: true,
          thumbnailUrl: true,
          publishedAt: true,
          category: { select: { name: true, color: true } },
        },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.news.count({
        where: {
          status: 'published',
          deletedAt: null,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { shortDesc: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      }),
    ])

    return NextResponse.json({ results, total, page, limit })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const districtId = searchParams.get('district_id')
    const categoryId = searchParams.get('category_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {
      status: 'published',
      deletedAt: null,
    }

    if (districtId) {
      where.districtId = districtId
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (q.trim().length >= 2) {
      const searchTerm = q.trim()
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { shortDesc: { contains: searchTerm, mode: 'insensitive' } },
        { content: { contains: searchTerm, mode: 'insensitive' } },
      ]
    } else if (!districtId && !categoryId) {
      // If no search term and no filters, return empty
      return NextResponse.json({ results: [], total: 0, page, limit })
    }

    const [results, total] = await Promise.all([
      db.news.findMany({
        where,
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
        where,
      }),
    ])

    return NextResponse.json({ results, total, page, limit })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

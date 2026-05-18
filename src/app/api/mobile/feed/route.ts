import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const districtId = searchParams.get('district_id')
    const categoryId = searchParams.get('category_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const lang = request.headers.get('accept-language')?.startsWith('te') ? 'te' : 'en'

    const where: Record<string, unknown> = {
      status: 'published',
      deletedAt: null,
      publishedAt: { lte: new Date() },
    }
    if (districtId) where.districtId = districtId
    if (categoryId) where.categoryId = categoryId

    const [news, total] = await Promise.all([
      db.news.findMany({
        where,
        select: {
          id: true,
          titleEn: true,
          titleTe: true,
          shortDescEn: true,
          shortDescTe: true,
          thumbnailUrl: true,
          priority: true,
          publishedAt: true,
          viewsCount: true,
          category: { select: { nameEn: true, nameTe: true, slug: true, color: true } },
          district: { select: { name: true } },
        },
        orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.news.count({ where }),
    ])

    // Get feed_inline ads
    const ads = await db.customAd.findMany({
      where: {
        placement: 'feed_inline',
        isActive: true,
        deletedAt: null,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      take: 2,
    })

    const feed = news.map((item, index) => {
      if ((index + 1) % 5 === 0 && ads.length > 0) {
        const ad = ads[index % ads.length]
        return {
          type: 'ad',
          ad: {
            ...ad,
            imagesUrls: JSON.parse(ad.imagesUrls),
            targetStateIds: JSON.parse(ad.targetStateIds),
            targetCategoryIds: JSON.parse(ad.targetCategoryIds),
          },
        }
      }
      return {
        type: 'news',
        news: {
          ...item,
          title: lang === 'te' ? item.titleTe : item.titleEn,
          shortDesc: lang === 'te' ? item.shortDescTe : item.shortDescEn,
          categoryName: lang === 'te' ? item.category.nameTe : item.category.nameEn,
        },
      }
    })

    return NextResponse.json({ feed, total, page, limit })
  } catch (error) {
    console.error('Feed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

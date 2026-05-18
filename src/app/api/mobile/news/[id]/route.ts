import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lang = request.headers.get('accept-language')?.startsWith('te') ? 'te' : 'en'

    const news = await db.news.findUnique({
      where: { id, status: 'published', deletedAt: null },
      include: {
        category: true,
        state: { select: { name: true } },
        district: { select: { name: true } },
        reporter: { select: { name: true, avatar: true } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
      },
    })

    if (!news) {
      return NextResponse.json({ error: 'News not found' }, { status: 404 })
    }

    // Get article_banner ad
    const ad = await db.customAd.findFirst({
      where: {
        placement: 'article_banner',
        isActive: true,
        deletedAt: null,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    })

    return NextResponse.json({
      news: {
        ...news,
        title: lang === 'te' ? news.titleTe : news.titleEn,
        shortDesc: lang === 'te' ? news.shortDescTe : news.shortDescEn,
        content: lang === 'te' ? news.contentTe : news.contentEn,
        imagesUrls: JSON.parse(news.imagesUrls),
        categoryName: lang === 'te' ? news.category.nameTe : news.category.nameEn,
      },
      ad: ad ? {
        ...ad,
        imagesUrls: JSON.parse(ad.imagesUrls),
        targetStateIds: JSON.parse(ad.targetStateIds),
        targetCategoryIds: JSON.parse(ad.targetCategoryIds),
      } : null,
    })
  } catch (error) {
    console.error('News detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (body.action === 'view') {
      await db.news.update({ where: { id }, data: { viewsCount: { increment: 1 } } })
    } else if (body.action === 'share') {
      await db.news.update({ where: { id }, data: { sharesCount: { increment: 1 } } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('News action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

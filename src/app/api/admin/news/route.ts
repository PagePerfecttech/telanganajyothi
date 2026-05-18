import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')
    const districtId = searchParams.get('districtId')
    const priority = searchParams.get('priority')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = { deletedAt: null }
    if (status) where.status = status
    if (categoryId) where.categoryId = categoryId
    if (districtId) where.districtId = districtId
    if (priority) where.priority = priority
    if (search) {
      where.OR = [
        { titleEn: { contains: search } },
        { titleTe: { contains: search } },
      ]
    }

    const [news, total] = await Promise.all([
      db.news.findMany({
        where,
        include: {
          category: { select: { nameEn: true, nameTe: true, color: true } },
          state: { select: { name: true } },
          district: { select: { name: true } },
          reporter: { select: { name: true } },
          admin: { select: { name: true } },
          tags: { include: { tag: { select: { name: true, slug: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.news.count({ where }),
    ])

    // Return simplified response with single fields
    const simplified = news.map(n => ({
      ...n,
      title: n.titleEn,
      shortDesc: n.shortDescEn,
      content: n.contentEn,
      category: n.category ? { ...n.category, name: n.category.nameEn } : n.category,
    }))

    return NextResponse.json({ news: simplified, total, page, limit })
  } catch (error) {
    console.error('News list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Accept single `title`/`shortDesc`/`content` and store in both En/Te
    const title = data.title || data.titleEn || ''
    const shortDesc = data.shortDesc || data.shortDescEn || ''
    const content = data.content || data.contentEn || ''

    // Get Telangana state ID if not provided
    let stateId = data.stateId
    if (!stateId) {
      const telangana = await db.state.findFirst({ where: { code: 'TG' } })
      stateId = telangana?.id || ''
    }

    const news = await db.news.create({
      data: {
        titleEn: title,
        titleTe: data.titleTe || title,
        shortDescEn: shortDesc || null,
        shortDescTe: data.shortDescTe || shortDesc || null,
        contentEn: content || null,
        contentTe: data.contentTe || content || null,
        categoryId: data.categoryId,
        stateId: stateId,
        districtId: data.districtId || null,
        thumbnailUrl: data.thumbnailUrl || '',
        imagesUrls: JSON.stringify(data.imagesUrls || []),
        videoUrl: data.videoUrl || null,
        sourceType: data.sourceType || 'original',
        reporterId: data.reporterId || null,
        priority: data.priority || 'normal',
        status: data.status || 'draft',
        isFeatured: data.isFeatured || false,
        publishedAt: data.status === 'published' ? new Date() : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdBy: data.createdBy,
      },
    })

    // Create tag associations
    if (data.tagIds && data.tagIds.length > 0) {
      await db.newsTag.createMany({
        data: data.tagIds.map((tagId: string) => ({
          newsId: news.id,
          tagId,
        })),
      })
    }

    // Audit log
    if (data.createdBy) {
      await db.auditLog.create({
        data: {
          adminId: data.createdBy,
          action: 'create',
          entity: 'news',
          entityId: news.id,
          changes: JSON.stringify({ title }),
        },
      })
    }

    return NextResponse.json(news, { status: 201 })
  } catch (error) {
    console.error('News create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

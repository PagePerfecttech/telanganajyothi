import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')
    const districtId = searchParams.get('districtId')
    const priority = searchParams.get('priority')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = { deletedAt: null }
    if (status && status !== 'all') where.status = status
    if (categoryId && categoryId !== 'all') where.categoryId = categoryId
    if (districtId && districtId !== 'all') where.districtId = districtId
    if (priority && priority !== 'all') where.priority = priority
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { shortDesc: { contains: search } },
      ]
    }

    const [news, total] = await Promise.all([
      db.news.findMany({
        where,
        include: {
          category: { select: { name: true, color: true } },
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

    const simplified = news.map(n => ({
      ...n,
      imagesUrls: JSON.parse(n.imagesUrls || '[]'),
    }))

    return NextResponse.json({ news: simplified, total, page, limit })
  } catch (error) {
    console.error('News list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await request.json()

    // Get Telangana state ID if not provided
    let stateId = data.stateId
    if (!stateId) {
      const telangana = await db.state.findFirst({ where: { code: 'TG' } })
      stateId = telangana?.id || ''
    }

    const news = await db.news.create({
      data: {
        title: data.title || '',
        shortDesc: data.shortDesc || null,
        content: data.content || null,
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
        createdBy: admin.id,
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
    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'create',
        entity: 'news',
        entityId: news.id,
        changes: JSON.stringify({ title: data.title }),
      },
    })

    return NextResponse.json({ ...news, imagesUrls: JSON.parse(news.imagesUrls || '[]') }, { status: 201 })
  } catch (error) {
    console.error('News create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { safeJsonParse, safeJsonStringify } from '@/lib/json-utils'
import { messaging } from '@/lib/firebase-admin'

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
        select: {
          id: true,
          title: true,
          shortDesc: true,
          thumbnailUrl: true,
          imagesUrls: true,
          status: true,
          priority: true,
          isFeatured: true,
          createdAt: true,
          publishedAt: true,
          categoryId: true,
          category: { select: { name: true, color: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.news.count({ where }),
    ])

    const simplified = news.map(n => ({
      ...n,
      imagesUrls: safeJsonParse<string[]>(n.imagesUrls || '[]', []),
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
        imagesUrls: safeJsonStringify(data.imagesUrls || []),
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

    // Send push notification if published and requested
    if (news.status === 'published' && data.sendNotification !== false) {
      try {
        await messaging.send({
          topic: news.districtId ? `district_${news.districtId}` : 'all',
          notification: {
            title: news.districtId ? 'New Update in Your District' : 'Breaking News',
            body: news.title,
            imageUrl: news.thumbnailUrl || undefined,
          },
          data: {
            route: `/feed?newsId=${news.id}`,
            newsId: news.id,
          },
          android: {
            notification: {
              sound: 'default',
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
              }
            }
          }
        })
      } catch (fcmError) {
        console.error('Failed to send FCM notification:', fcmError)
      }
    }

    return NextResponse.json({ ...news, imagesUrls: safeJsonParse<string[]>(news.imagesUrls || '[]', []) }, { status: 201 })
  } catch (error) {
    console.error('News create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

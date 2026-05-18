import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const news = await db.news.findUnique({
      where: { id, deletedAt: null },
      include: {
        category: true,
        state: true,
        district: true,
        reporter: true,
        admin: { select: { name: true, email: true } },
        tags: { include: { tag: true } },
      },
    })

    if (!news) {
      return NextResponse.json({ error: 'News not found' }, { status: 404 })
    }

    return NextResponse.json(news)
  } catch (error) {
    console.error('News get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()

    const news = await db.news.update({
      where: { id },
      data: {
        titleEn: data.titleEn,
        titleTe: data.titleTe,
        shortDescEn: data.shortDescEn || null,
        shortDescTe: data.shortDescTe || null,
        contentEn: data.contentEn || null,
        contentTe: data.contentTe || null,
        categoryId: data.categoryId,
        stateId: data.stateId,
        districtId: data.districtId || null,
        thumbnailUrl: data.thumbnailUrl || '',
        imagesUrls: JSON.stringify(data.imagesUrls || []),
        videoUrl: data.videoUrl || null,
        sourceType: data.sourceType || 'original',
        reporterId: data.reporterId || null,
        priority: data.priority || 'normal',
        status: data.status,
        isFeatured: data.isFeatured || false,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        publishedAt: data.status === 'published' ? new Date() : undefined,
        rejectReason: data.rejectReason || null,
      },
    })

    // Update tags
    if (data.tagIds) {
      await db.newsTag.deleteMany({ where: { newsId: id } })
      if (data.tagIds.length > 0) {
        await db.newsTag.createMany({
          data: data.tagIds.map((tagId: string) => ({
            newsId: id,
            tagId,
          })),
        })
      }
    }

    // Audit log
    if (data.updatedBy) {
      await db.auditLog.create({
        data: {
          adminId: data.updatedBy,
          action: 'update',
          entity: 'news',
          entityId: id,
          changes: JSON.stringify({ title: data.titleEn, status: data.status }),
        },
      })
    }

    return NextResponse.json(news)
  } catch (error) {
    console.error('News update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()

    const updateData: Record<string, unknown> = { status: data.status }
    if (data.status === 'published') {
      updateData.publishedAt = new Date()
    }
    if (data.status === 'rejected') {
      updateData.rejectReason = data.rejectReason || null
    }

    const news = await db.news.update({
      where: { id },
      data: updateData,
    })

    if (data.adminId) {
      await db.auditLog.create({
        data: {
          adminId: data.adminId,
          action: `status_${data.status}`,
          entity: 'news',
          entityId: id,
          changes: JSON.stringify({ status: data.status, rejectReason: data.rejectReason }),
        },
      })
    }

    return NextResponse.json(news)
  } catch (error) {
    console.error('News status update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.news.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('News delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    // Return simplified with single fields
    return NextResponse.json({
      ...news,
      title: news.titleEn,
      shortDesc: news.shortDescEn,
      content: news.contentEn,
    })
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

    // Accept single `title`/`shortDesc`/`content` and store in both En/Te
    const title = data.title || data.titleEn
    const shortDesc = data.shortDesc || data.shortDescEn
    const content = data.content || data.contentEn

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) { updateData.titleEn = title; updateData.titleTe = data.titleTe || title }
    if (shortDesc !== undefined) { updateData.shortDescEn = shortDesc || null; updateData.shortDescTe = data.shortDescTe || shortDesc || null }
    if (content !== undefined) { updateData.contentEn = content || null; updateData.contentTe = data.contentTe || content || null }
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
    if (data.stateId !== undefined) updateData.stateId = data.stateId
    if (data.districtId !== undefined) updateData.districtId = data.districtId || null
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl || ''
    if (data.imagesUrls !== undefined) updateData.imagesUrls = JSON.stringify(data.imagesUrls || [])
    if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl || null
    if (data.sourceType !== undefined) updateData.sourceType = data.sourceType
    if (data.reporterId !== undefined) updateData.reporterId = data.reporterId || null
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.status !== undefined) {
      updateData.status = data.status
      if (data.status === 'published') updateData.publishedAt = new Date()
    }
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null
    if (data.rejectReason !== undefined) updateData.rejectReason = data.rejectReason || null

    const news = await db.news.update({
      where: { id },
      data: updateData,
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
          changes: JSON.stringify({ title, status: data.status }),
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

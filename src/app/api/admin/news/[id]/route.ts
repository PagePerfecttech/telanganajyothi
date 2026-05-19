import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    return NextResponse.json({
      ...news,
      imagesUrls: JSON.parse(news.imagesUrls || '[]'),
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
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const data = await request.json()

    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.shortDesc !== undefined) updateData.shortDesc = data.shortDesc || null
    if (data.content !== undefined) updateData.content = data.content || null
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
    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'update',
        entity: 'news',
        entityId: id,
        changes: JSON.stringify({ title: data.title, status: data.status }),
      },
    })

    return NextResponse.json({ ...news, imagesUrls: JSON.parse(news.imagesUrls || '[]') })
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
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: `status_${data.status}`,
        entity: 'news',
        entityId: id,
        changes: JSON.stringify({ status: data.status, rejectReason: data.rejectReason }),
      },
    })

    return NextResponse.json(news)
  } catch (error) {
    console.error('News status update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await db.news.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'delete',
        entity: 'news',
        entityId: id,
        changes: '{}',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('News delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

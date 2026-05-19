import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const videos = await db.video.findMany({
      where: { deletedAt: null },
      include: { category: { select: { name: true, color: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(videos)
  } catch (error) {
    console.error('Videos list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const data = await request.json()
    const video = await db.video.create({
      data: {
        title: data.title,
        description: data.description || null,
        videoUrl: data.videoUrl,
        thumbnailUrl: data.thumbnailUrl || null,
        duration: data.duration || 0,
        categoryId: data.categoryId || null,
        status: data.status || 'draft',
      },
    })
    await logAudit({
      adminId: admin.id,
      action: 'create',
      entity: 'video',
      entityId: video.id,
      ipAddress: getClientIp(request),
      changes: { title: data.title, videoUrl: data.videoUrl, status: data.status || 'draft' },
    })
    return NextResponse.json(video, { status: 201 })
  } catch (error) {
    console.error('Video create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
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
    return NextResponse.json(video, { status: 201 })
  } catch (error) {
    console.error('Video create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

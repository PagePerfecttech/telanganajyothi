import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const video = await db.video.findUnique({
      where: { id, deletedAt: null },
      include: { category: true },
    })
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }
    return NextResponse.json(video)
  } catch (error) {
    console.error('Video get error:', error)
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
    const video = await db.video.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description || null,
        videoUrl: data.videoUrl,
        thumbnailUrl: data.thumbnailUrl || null,
        duration: data.duration,
        categoryId: data.categoryId || null,
        status: data.status,
      },
    })
    return NextResponse.json(video)
  } catch (error) {
    console.error('Video update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.video.update({ where: { id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Video delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

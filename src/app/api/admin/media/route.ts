import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const media = await db.media.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(media)
  } catch (error) {
    console.error('Media list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const media = await db.media.create({
      data: {
        filename: data.filename,
        originalUrl: data.originalUrl,
        thumbnailUrl: data.thumbnailUrl || null,
        mimeType: data.mimeType || null,
        size: data.size || 0,
        alt: data.alt || null,
        uploadedBy: data.uploadedBy || null,
      },
    })
    return NextResponse.json(media, { status: 201 })
  } catch (error) {
    console.error('Media create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

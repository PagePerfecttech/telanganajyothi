import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { s3Client, R2_BUCKET } from '@/lib/r2'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    
    const media = await db.media.findUnique({ where: { id } })
    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Try deleting physical object from Cloudflare R2 if originalUrl contains filename
    if (media.originalUrl) {
      try {
        const key = media.originalUrl.split('/').pop()
        if (key) {
          await s3Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
        }
      } catch (r2Err) {
        console.warn('R2 deletion warning:', r2Err)
      }
    }

    await db.media.update({ where: { id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Media delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


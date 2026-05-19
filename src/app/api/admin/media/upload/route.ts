import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import path from 'path'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'
import { s3Client, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Generate unique filename
    const ext = path.extname(file.name) || (file.type.startsWith('image/') ? '.jpg' : '.mp4')
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const filename = `${timestamp}-${randomStr}${ext}`

    // Upload to Cloudflare R2
    const buffer = Buffer.from(await file.arrayBuffer())
    await s3Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
      })
    )

    // Generate URLs
    const originalUrl = `${R2_PUBLIC_URL}/${filename}`
    const thumbnailUrl = file.type.startsWith('image/') ? originalUrl : null

    // Save to media library in database
    const media = await db.media.create({
      data: {
        filename: file.name,
        originalUrl,
        thumbnailUrl,
        mimeType: file.type,
        size: file.size,
        alt: file.name,
        uploadedBy: formData.get('uploadedBy') as string || null,
      },
    })

    await logAudit({
      adminId: admin.id,
      action: 'upload',
      entity: 'media',
      entityId: media.id,
      ipAddress: getClientIp(request),
      changes: { filename: file.name, mimeType: file.type, size: file.size, originalUrl },
    })
    return NextResponse.json({
      id: media.id,
      url: originalUrl,
      thumbnailUrl,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    }, { status: 201 })
  } catch (error) {
    console.error('Media upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

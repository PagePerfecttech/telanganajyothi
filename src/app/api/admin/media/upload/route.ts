import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { logAudit, getClientIp } from '@/lib/audit'

export async function POST(request: NextRequest) {
  try {
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

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Write file to disk
    const filePath = path.join(uploadsDir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // Generate URLs
    const originalUrl = `/uploads/${filename}`
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
      adminId: (formData.get('uploadedBy') as string) || 'system',
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

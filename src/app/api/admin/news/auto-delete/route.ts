import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'
import { s3Client, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs/promises'
import path from 'path'

async function deleteMediaFile(url: string | null | undefined): Promise<boolean> {
  if (!url || typeof url !== 'string' || !url.trim()) return false
  const cleanUrl = url.trim()

  try {
    // 1. Handle R2 / S3 Cloud storage deletion
    if (R2_PUBLIC_URL && cleanUrl.startsWith(R2_PUBLIC_URL)) {
      const key = cleanUrl.replace(`${R2_PUBLIC_URL}/`, '')
      if (key) {
        await s3Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
      }
    }

    // 2. Handle Local disk storage deletion
    if (cleanUrl.startsWith('/') || cleanUrl.includes('/uploads/')) {
      const relPath = cleanUrl.includes('/uploads/') ? cleanUrl.substring(cleanUrl.indexOf('/uploads/')) : cleanUrl
      const absPath = path.join(process.cwd(), 'public', relPath)
      await fs.unlink(absPath).catch(() => null)
    }

    // 3. Remove entry from Media library table if exists
    await db.media.deleteMany({
      where: {
        OR: [
          { originalUrl: cleanUrl },
          { thumbnailUrl: cleanUrl },
        ],
      },
    }).catch(() => null)

    return true
  } catch (err) {
    console.error('Media delete error for URL:', cleanUrl, err)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    
    // Check retention days override from body or system settings
    let days = body.days ? parseInt(String(body.days), 10) : NaN

    if (isNaN(days)) {
      const setting = await db.setting.findUnique({ where: { key: 'auto_delete_days' } })
      days = setting ? parseInt(setting.value, 10) : 0
    }

    if (isNaN(days) || days <= 0) {
      return NextResponse.json({
        success: true,
        message: 'Auto delete news is currently disabled (days = 0)',
        deletedNewsCount: 0,
        deletedMediaCount: 0,
      })
    }

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Find all old news items published or created before cutoffDate
    const oldNewsItems = await db.news.findMany({
      where: {
        OR: [
          { publishedAt: { lt: cutoffDate } },
          { publishedAt: null, createdAt: { lt: cutoffDate } },
        ],
      },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        imagesUrls: true,
        videoUrl: true,
      },
    })

    let deletedNewsCount = 0
    let deletedMediaCount = 0

    for (const item of oldNewsItems) {
      const mediaUrlsToClean: string[] = []

      if (item.thumbnailUrl) mediaUrlsToClean.push(item.thumbnailUrl)
      if (item.videoUrl) mediaUrlsToClean.push(item.videoUrl)

      if (item.imagesUrls) {
        try {
          const parsed = typeof item.imagesUrls === 'string' ? JSON.parse(item.imagesUrls) : item.imagesUrls
          if (Array.isArray(parsed)) {
            for (const img of parsed) {
              if (typeof img === 'string') mediaUrlsToClean.push(img)
            }
          }
        } catch (_) {
          // Ignore JSON parse errors for media URLs
        }
      }

      // Delete media files
      for (const mediaUrl of mediaUrlsToClean) {
        const deleted = await deleteMediaFile(mediaUrl)
        if (deleted) deletedMediaCount++
      }

      // Hard delete news record (relational bookmarks, comments, reactions cascade automatically)
      await db.news.delete({ where: { id: item.id } })
      deletedNewsCount++
    }

    await logAudit({
      adminId: admin.id,
      action: 'delete',
      entity: 'news',
      ipAddress: getClientIp(request),
      changes: { days, cutoffDate: cutoffDate.toISOString(), deletedNewsCount, deletedMediaCount },
    })

    return NextResponse.json({
      success: true,
      message: `Successfully purged ${deletedNewsCount} news articles older than ${days} days and ${deletedMediaCount} media files.`,
      deletedNewsCount,
      deletedMediaCount,
      cutoffDate: cutoffDate.toISOString(),
      days,
    })
  } catch (error) {
    console.error('Auto delete news error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}

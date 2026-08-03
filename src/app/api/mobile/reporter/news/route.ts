import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { s3Client, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { processNewsApprovalEarning } from '@/lib/wallet-service'
import { generateAINewsRewrite } from '@/lib/gemini-service'

import { applyWatermark } from '@/lib/watermark'

async function uploadFileToR2(file: File, prefix: string): Promise<string> {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${prefix}-${timestamp}-${randomStr}.${ext}`
  let buffer: any = Buffer.from(await file.arrayBuffer())

  // Apply light SPOT NEWS watermark to image uploads
  if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext.toLowerCase())) {
    buffer = await applyWatermark(buffer, file.type || 'image/jpeg');
  }
  
  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: filename,
      Body: buffer as any,
      ContentType: file.type || 'application/octet-stream',
    })
  )
  return `${R2_PUBLIC_URL}/${filename}`
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(authHeader);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }

    const phone = decodedToken.phone_number;
    if (!phone) {
       return NextResponse.json({ error: 'Token missing phone number' }, { status: 401 })
    }

    const reporter = await db.reporter.findUnique({ where: { phone } })
    if (!reporter) {
      return NextResponse.json({ error: 'Not a reporter' }, { status: 403 })
    }

    const news = await db.news.findMany({
      where: { reporterId: reporter.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        shortDesc: true,
        thumbnailUrl: true,
        status: true,
        rejectReason: true,
        createdAt: true,
      }
    })

    const pending = news.filter(n => n.status === 'pending_review' || n.status === 'draft')
    const published = news.filter(n => n.status === 'published')
    const rejected = news.filter(n => n.status === 'rejected')

    return NextResponse.json({
      counts: {
        total: news.length,
        pending: pending.length,
        published: published.length,
        rejected: rejected.length,
      },
      news: {
        pending,
        published,
        rejected
      }
    })
  } catch (error) {
    console.error('Reporter news fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(authHeader);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }

    const phone = decodedToken.phone_number;
    if (!phone) {
       return NextResponse.json({ error: 'Token missing phone number' }, { status: 401 })
    }

    // Verify user is an active reporter
    const reporter = await db.reporter.findUnique({ where: { phone } })
    if (!reporter || reporter.status !== 'active') {
      return NextResponse.json({ error: 'Not an active reporter' }, { status: 403 })
    }

    let title, shortDesc, categoryId, stateId, districtId, thumbnailUrl, videoUrl, thumbnailBase64;
    
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = formData.get('title') as string;
      shortDesc = formData.get('shortDesc') as string;
      categoryId = formData.get('categoryId') as string;
      stateId = formData.get('stateId') as string;
      districtId = formData.get('districtId') as string;
      
      const file = formData.get('file') as File | null;
      if (file && file.size > 0) {
         thumbnailUrl = await uploadFileToR2(file, 'reporter-thumb');
      } else {
         thumbnailUrl = formData.get('thumbnailUrl') as string | null;
      }

      const videoFile = formData.get('videoFile') as File | null;
      if (videoFile && videoFile.size > 0) {
         videoUrl = await uploadFileToR2(videoFile, 'reporter-video');
      } else {
         videoUrl = formData.get('videoUrl') as string | null;
      }
    } else {
      const data = await request.json()
      title = data.title;
      shortDesc = data.shortDesc;
      categoryId = data.categoryId;
      stateId = data.stateId;
      districtId = data.districtId;
      thumbnailBase64 = data.thumbnailBase64;
      thumbnailUrl = data.thumbnailUrl;
      videoUrl = data.videoUrl;
    }

    if (!title || !categoryId) {
       return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Daily posting limit check (Crime category exempt)
    const category = await db.category.findUnique({ where: { id: categoryId } })
    const isCrimeCategory = category?.name?.toLowerCase().includes('crime') || category?.slug?.toLowerCase().includes('crime')

    if (!isCrimeCategory) {
      const isSenior = reporter.role === 'senior' || reporter.canPublishDirectly
      const limitKey = isSenior ? 'limit_senior_daily' : 'limit_junior_daily'
      const defaultLimit = isSenior ? 10 : 5
      const setting = await db.setting.findUnique({ where: { key: limitKey } })
      const maxDailyLimit = setting ? parseInt(setting.value, 10) : defaultLimit

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const todaySubmissionsCount = await db.news.count({
        where: {
          reporterId: reporter.id,
          createdAt: { gte: startOfDay },
          deletedAt: null,
        },
      })

      if (todaySubmissionsCount >= maxDailyLimit) {
        return NextResponse.json({
          error: `Daily submission limit reached (${maxDailyLimit} news/day for ${isSenior ? 'Senior' : 'Junior'} Reporters). Crime news is exempt from limits.`,
        }, { status: 429 })
      }
    }
    
    // Force the news location to match the reporter's allotted location
    stateId = reporter.stateId || stateId;
    districtId = reporter.districtId || districtId;
    
    if (!stateId) {
       return NextResponse.json({ error: 'Reporter location not configured' }, { status: 400 })
    }

    if (thumbnailBase64) {
      try {
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8)
        const filename = `reporter-${timestamp}-${randomStr}.jpg`
        const buffer = Buffer.from(thumbnailBase64, 'base64')
        
        await s3Client.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: filename,
            Body: buffer,
            ContentType: 'image/jpeg',
          })
        )
        thumbnailUrl = `${R2_PUBLIC_URL}/${filename}`
      } catch (err) {
        console.error('Base64 upload error:', err)
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
      }
    }

    if (!thumbnailUrl && !videoUrl) {
       return NextResponse.json({ error: 'Thumbnail or Video is required' }, { status: 400 })
    }

    // Find a system admin to assign as creator
    const admin = await db.admin.findFirst();
    if (!admin) {
      return NextResponse.json({ error: 'System configuration error: No admins found' }, { status: 500 })
    }

    const news = await db.news.create({
      data: {
        title,
        shortDesc,
        categoryId,
        stateId,
        districtId: districtId || reporter.districtId,
        thumbnailUrl: thumbnailUrl || '',
        videoUrl,
        sourceType: 'reporter',
        reporterId: reporter.id,
        status: reporter.canPublishDirectly ? 'published' : 'pending_review',
        publishedAt: reporter.canPublishDirectly ? new Date() : null,
        createdBy: admin.id,
      }
    })

    if (reporter.canPublishDirectly) {
      await processNewsApprovalEarning(news.id, !!videoUrl)
    }

    // Trigger async Gemini AI rewrite for professional headline & content suggestions
    generateAINewsRewrite(title, shortDesc || '', shortDesc || undefined).then((aiResult) => {
      if (aiResult) {
        db.news.update({
          where: { id: news.id },
          data: {
            aiTitle: aiResult.aiTitle,
            aiShortDesc: aiResult.aiShortDesc,
            aiContent: aiResult.aiContent,
            aiStatus: 'generated',
          },
        }).catch((err) => console.error('Failed to save AI news rewrite:', err))
      }
    }).catch((err) => console.error('AI news generation error:', err))

    return NextResponse.json({ message: 'News submitted successfully', news })
  } catch (error) {
    console.error('Reporter news submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

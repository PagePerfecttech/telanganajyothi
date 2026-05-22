import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { s3Client, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import path from 'path'

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

    const data = await request.json()
    const { title, shortDesc, categoryId, stateId, districtId, thumbnailBase64 } = data;
    let { thumbnailUrl } = data;

    if (!title || !categoryId || !stateId) {
       return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    if (!thumbnailUrl) {
       return NextResponse.json({ error: 'Thumbnail is required' }, { status: 400 })
    }

    // Find a system admin to assign as creator, or allow reporter creation
    // The schema requires `createdBy` which is an Admin ID. 
    // We'll just fetch any admin to satisfy the constraint, or maybe we need to update schema?
    // Let's find the first admin.
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
        thumbnailUrl,
        sourceType: 'reporter',
        reporterId: reporter.id,
        status: reporter.canPublishDirectly ? 'published' : 'pending_review',
        publishedAt: reporter.canPublishDirectly ? new Date() : null,
        createdBy: admin.id,
      }
    })

    return NextResponse.json({ message: 'News submitted successfully', news })
  } catch (error) {
    console.error('Reporter news submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

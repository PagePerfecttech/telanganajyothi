import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { findReporterFromToken } from '@/lib/reporter-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization')
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(authHeader);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }

    const reporter = await findReporterFromToken(decodedToken);
    if (!reporter) {
      return NextResponse.json({ error: 'Not a reporter' }, { status: 403 })
    }

    const news = await db.news.findFirst({
      where: { id, reporterId: reporter.id, deletedAt: null }
    })

    if (!news) {
      return NextResponse.json({ error: 'News article not found' }, { status: 404 })
    }

    return NextResponse.json(news)
  } catch (error) {
    console.error('Fetch reporter news detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization')
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(authHeader);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }

    const reporter = await findReporterFromToken(decodedToken);
    if (!reporter) {
      return NextResponse.json({ error: 'Not a reporter' }, { status: 403 })
    }

    const existingNews = await db.news.findFirst({
      where: { id, reporterId: reporter.id, deletedAt: null }
    })

    if (!existingNews) {
      return NextResponse.json({ error: 'News article not found' }, { status: 404 })
    }

    const data = await request.json()

    const updatedNews = await db.news.update({
      where: { id: existingNews.id },
      data: {
        title: data.title || existingNews.title,
        shortDesc: data.shortDesc !== undefined ? data.shortDesc : existingNews.shortDesc,
        categoryId: data.categoryId || existingNews.categoryId,
        districtId: data.districtId || existingNews.districtId,
        mandalId: data.mandalId !== undefined ? data.mandalId : existingNews.mandalId,
        thumbnailUrl: data.thumbnailUrl || existingNews.thumbnailUrl,
        videoUrl: data.videoUrl !== undefined ? data.videoUrl : existingNews.videoUrl,
        sourceUrl: data.customLink || data.sourceUrl || existingNews.sourceUrl,
        status: reporter.canPublishDirectly ? 'published' : 'pending_review',
      }
    })

    return NextResponse.json({ message: 'News updated successfully', news: updatedNews })
  } catch (error) {
    console.error('Update reporter news error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

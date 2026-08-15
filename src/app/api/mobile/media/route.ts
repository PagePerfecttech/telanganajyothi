import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { findReporterFromToken } from '@/lib/reporter-utils'

export async function GET(request: NextRequest) {
  try {
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

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '30')
    const skip = (page - 1) * limit

    const media = await db.media.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        filename: true,
        originalUrl: true,
        thumbnailUrl: true,
        createdAt: true,
      }
    })

    return NextResponse.json({ media, page, limit })
  } catch (error) {
    console.error('Mobile media list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

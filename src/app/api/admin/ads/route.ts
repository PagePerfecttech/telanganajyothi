import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const ads = await db.customAd.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(ads.map(ad => ({
      ...ad,
      imagesUrls: JSON.parse(ad.imagesUrls),
      targetStateIds: JSON.parse(ad.targetStateIds),
      targetCategoryIds: JSON.parse(ad.targetCategoryIds),
    })))
  } catch (error) {
    console.error('Ads list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const ad = await db.customAd.create({
      data: {
        title: data.title,
        advertiser: data.advertiser,
        type: data.type || 'image',
        imagesUrls: JSON.stringify(data.imagesUrls || []),
        layout: data.layout || 'grid',
        videoUrl: data.videoUrl || null,
        clickUrl: data.clickUrl || null,
        placement: data.placement || 'feed_inline',
        targetStateIds: JSON.stringify(data.targetStateIds || []),
        targetCategoryIds: JSON.stringify(data.targetCategoryIds || []),
        impressionsLimit: data.impressionsLimit || 0,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive ?? true,
      },
    })
    return NextResponse.json(ad, { status: 201 })
  } catch (error) {
    console.error('Ad create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

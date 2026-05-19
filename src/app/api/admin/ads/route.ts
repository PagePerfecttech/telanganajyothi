import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'

export async function GET() {
  try {
    const ads = await db.customAd.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(ads.map(ad => ({
      ...ad,
      type: ad.type === 'image' ? 'poster' : ad.type,
      imagesUrls: JSON.parse(ad.imagesUrls),
      targetStateIds: JSON.parse(ad.targetStateIds),
      targetCategoryIds: JSON.parse(ad.targetCategoryIds),
      frequency: ad.frequency || 5,
    })))
  } catch (error) {
    console.error('Ads list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    // Map 'poster' to 'image' for DB storage
    const adType = data.type === 'poster' ? 'image' : data.type || 'image'

    const ad = await db.customAd.create({
      data: {
        title: data.title,
        advertiser: data.advertiser,
        type: adType,
        imagesUrls: JSON.stringify(data.imagesUrls || []),
        layout: data.layout || 'grid',
        videoUrl: data.videoUrl || null,
        clickUrl: data.clickUrl || null,
        placement: data.placement || 'feed_inline',
        frequency: data.frequency || 5,
        targetStateIds: JSON.stringify(data.targetStateIds || []),
        targetCategoryIds: JSON.stringify(data.targetCategoryIds || []),
        impressionsLimit: data.impressionsLimit || 0,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive ?? true,
      },
    })
    await logAudit({
      adminId: data.createdBy || data.adminId || 'system',
      action: 'create',
      entity: 'ad',
      entityId: ad.id,
      ipAddress: getClientIp(request),
      changes: { title: data.title, advertiser: data.advertiser, type: adType, placement: data.placement },
    })
    return NextResponse.json({
      ...ad,
      type: ad.type === 'image' ? 'poster' : ad.type,
      imagesUrls: JSON.parse(ad.imagesUrls),
      targetStateIds: JSON.parse(ad.targetStateIds),
      targetCategoryIds: JSON.parse(ad.targetCategoryIds),
    }, { status: 201 })
  } catch (error) {
    console.error('Ad create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

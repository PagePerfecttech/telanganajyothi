import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ad = await db.customAd.findUnique({ where: { id, deletedAt: null } })
    if (!ad) return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    return NextResponse.json({
      ...ad,
      imagesUrls: JSON.parse(ad.imagesUrls),
      targetStateIds: JSON.parse(ad.targetStateIds),
      targetCategoryIds: JSON.parse(ad.targetCategoryIds),
    })
  } catch (error) {
    console.error('Ad get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    const ad = await db.customAd.update({
      where: { id },
      data: {
        title: data.title,
        advertiser: data.advertiser,
        type: data.type,
        imagesUrls: JSON.stringify(data.imagesUrls || []),
        layout: data.layout,
        videoUrl: data.videoUrl || null,
        clickUrl: data.clickUrl || null,
        placement: data.placement,
        targetStateIds: JSON.stringify(data.targetStateIds || []),
        targetCategoryIds: JSON.stringify(data.targetCategoryIds || []),
        impressionsLimit: data.impressionsLimit,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive,
      },
    })
    return NextResponse.json(ad)
  } catch (error) {
    console.error('Ad update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.customAd.update({ where: { id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ad delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

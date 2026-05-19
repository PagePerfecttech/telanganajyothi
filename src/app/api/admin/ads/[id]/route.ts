import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'

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
      type: ad.type === 'image' ? 'poster' : ad.type,
      imagesUrls: JSON.parse(ad.imagesUrls),
      targetStateIds: JSON.parse(ad.targetStateIds),
      targetCategoryIds: JSON.parse(ad.targetCategoryIds),
      frequency: ad.frequency || 5,
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
    // Map 'poster' to 'image' for DB storage
    const adType = data.type === 'poster' ? 'image' : data.type || 'image'

    const updateData = {
      title: data.title,
      advertiser: data.advertiser,
      type: adType,
      imagesUrls: JSON.stringify(data.imagesUrls || []),
      layout: data.layout || 'grid',
      videoUrl: data.videoUrl || null,
      clickUrl: data.clickUrl || null,
      placement: data.placement,
      frequency: data.frequency || 5,
      targetStateIds: JSON.stringify(data.targetStateIds || []),
      targetCategoryIds: JSON.stringify(data.targetCategoryIds || []),
      impressionsLimit: data.impressionsLimit,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      isActive: data.isActive,
    }
    const ad = await db.customAd.update({
      where: { id },
      data: updateData,
    })
    await logAudit({
      adminId: data.updatedBy || data.adminId || 'system',
      action: 'update',
      entity: 'ad',
      entityId: id,
      ipAddress: getClientIp(request),
      changes: { title: data.title, advertiser: data.advertiser, type: adType, placement: data.placement, isActive: data.isActive },
    })
    return NextResponse.json({
      ...ad,
      type: ad.type === 'image' ? 'poster' : ad.type,
    })
  } catch (error) {
    console.error('Ad update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.customAd.update({ where: { id }, data: { deletedAt: new Date() } })
    await logAudit({
      adminId: 'system',
      action: 'delete',
      entity: 'ad',
      entityId: id,
      ipAddress: getClientIp(request),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ad delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

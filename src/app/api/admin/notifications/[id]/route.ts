import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const notification = await db.pushNotification.findUnique({ where: { id, deletedAt: null } })
    if (!notification) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    return NextResponse.json(notification)
  } catch (error) {
    console.error('Notification get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const data = await request.json()
    const updateData = {
      title: data.title,
      body: data.body,
      imageUrl: data.imageUrl || null,
      targetType: data.targetType,
      targetValue: data.targetValue || null,
      newsId: data.newsId || null,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      status: data.status,
    }
    const notification = await db.pushNotification.update({
      where: { id },
      data: updateData,
    })
    await logAudit({
      adminId: admin.id,
      action: 'update',
      entity: 'notification',
      entityId: id,
      ipAddress: getClientIp(request),
      changes: { title: data.title, targetType: data.targetType, status: data.status },
    })
    return NextResponse.json(notification)
  } catch (error) {
    console.error('Notification update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    await db.pushNotification.update({ where: { id }, data: { deletedAt: new Date() } })
    await logAudit({
      adminId: admin.id,
      action: 'delete',
      entity: 'notification',
      entityId: id,
      ipAddress: getClientIp(request),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'

export async function GET() {
  try {
    const notifications = await db.pushNotification.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Notifications list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const notification = await db.pushNotification.create({
      data: {
        title: data.title,
        body: data.body,
        imageUrl: data.imageUrl || null,
        targetType: data.targetType || 'all',
        targetValue: data.targetValue || null,
        newsId: data.newsId || null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: data.scheduledAt ? 'scheduled' : (data.sendNow ? 'sent' : 'draft'),
      },
    })
    await logAudit({
      adminId: data.createdBy || data.adminId || 'system',
      action: 'send',
      entity: 'notification',
      entityId: notification.id,
      ipAddress: getClientIp(request),
      changes: { title: data.title, targetType: data.targetType, status: notification.status },
    })
    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Notification create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

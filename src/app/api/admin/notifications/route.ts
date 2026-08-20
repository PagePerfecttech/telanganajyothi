import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    
    // If sending now, trigger Firebase Messaging
    if (notification.status === 'sent') {
      try {
        const { messaging } = await import('@/lib/firebase-admin')
        
        const messagePayload: any = {
          notification: {
            title: notification.title,
            body: notification.body,
          },
          topic: 'all', // For now we send to a global topic 'all'
        }
        
        if (notification.imageUrl && notification.imageUrl.startsWith('http')) {
          messagePayload.notification.imageUrl = notification.imageUrl
        }
        
        if (notification.newsId) {
          messagePayload.data = {
            route: `/p/${notification.newsId}`,
          }
        }
        
        await messaging.send(messagePayload)
        console.log('Firebase notification sent successfully')
      } catch (fcmError) {
        console.error('Error sending Firebase notification:', fcmError)
        // Update status to failed
        await db.pushNotification.update({
          where: { id: notification.id },
          data: { status: 'failed' }
        })
      }
    }

    await logAudit({
      adminId: admin.id,
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

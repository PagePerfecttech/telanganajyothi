import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params
    const data = await request.json()
    const notification = await db.pushNotification.update({
      where: { id },
      data: {
        title: data.title,
        body: data.body,
        imageUrl: data.imageUrl || null,
        targetType: data.targetType,
        targetValue: data.targetValue || null,
        newsId: data.newsId || null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: data.status,
      },
    })
    return NextResponse.json(notification)
  } catch (error) {
    console.error('Notification update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.pushNotification.update({ where: { id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

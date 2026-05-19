import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const reporter = await db.reporter.findUnique({
      where: { id, deletedAt: null },
      include: {
        state: true,
        district: true,
        _count: { select: { news: { where: { deletedAt: null } } } },
      },
    })
    if (!reporter) return NextResponse.json({ error: 'Reporter not found' }, { status: 404 })

    const newsStats = await db.news.groupBy({
      by: ['status'],
      where: { reporterId: id, deletedAt: null },
      _count: { id: true },
    })

    return NextResponse.json({ ...reporter, newsStats })
  } catch (error) {
    console.error('Reporter get error:', error)
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
    const updateData = {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      avatar: data.avatar || null,
      bio: data.bio || null,
      stateId: data.stateId,
      districtId: data.districtId,
      beat: data.beat || null,
      status: data.status,
      canPublishDirectly: data.canPublishDirectly,
    }
    const reporter = await db.reporter.update({
      where: { id },
      data: updateData,
    })
    await logAudit({
      adminId: data.updatedBy || data.adminId || 'system',
      action: 'update',
      entity: 'reporter',
      entityId: id,
      ipAddress: getClientIp(request),
      changes: updateData,
    })
    return NextResponse.json(reporter)
  } catch (error) {
    console.error('Reporter update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.reporter.update({ where: { id }, data: { deletedAt: new Date() } })
    await logAudit({
      adminId: 'system',
      action: 'delete',
      entity: 'reporter',
      entityId: id,
      ipAddress: getClientIp(request),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reporter delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

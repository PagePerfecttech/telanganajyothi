import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    const updateData = {
      name: data.name,
      slug: data.slug,
      type: data.type,
      isTrending: data.isTrending,
      isActive: data.isActive,
    }
    const tag = await db.tag.update({
      where: { id },
      data: updateData,
    })
    await logAudit({
      adminId: data.updatedBy || data.adminId || 'system',
      action: 'update',
      entity: 'tag',
      entityId: id,
      ipAddress: getClientIp(request),
      changes: updateData,
    })
    return NextResponse.json(tag)
  } catch (error) {
    console.error('Tag update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.tag.update({ where: { id }, data: { deletedAt: new Date() } })
    await logAudit({
      adminId: 'system',
      action: 'delete',
      entity: 'tag',
      entityId: id,
      ipAddress: getClientIp(request),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tag delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

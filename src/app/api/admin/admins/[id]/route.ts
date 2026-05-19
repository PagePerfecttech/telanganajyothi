import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { logAudit, getClientIp } from '@/lib/audit'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()

    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.email !== undefined) updateData.email = data.email
    if (data.role !== undefined) updateData.role = data.role
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.avatar !== undefined) updateData.avatar = data.avatar
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10)

    const admin = await db.admin.update({
      where: { id },
      data: updateData,
    })

    await logAudit({
      adminId: data.updatedBy || data.adminId || 'system',
      action: 'update',
      entity: 'admin',
      entityId: id,
      ipAddress: getClientIp(request),
      changes: updateData,
    })

    return NextResponse.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      isActive: admin.isActive,
    })
  } catch (error) {
    console.error('Admin update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.admin.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    await logAudit({
      adminId: 'system',
      action: 'delete',
      entity: 'admin',
      entityId: id,
      ipAddress: getClientIp(request),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

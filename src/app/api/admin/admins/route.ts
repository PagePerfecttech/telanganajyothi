import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admins = await db.admin.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { news: true, auditLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(admins)
  } catch (error) {
    console.error('Admins list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const data = await request.json()
    const plainPassword = data.password || 'password123'
    const hashedPassword = await bcrypt.hash(plainPassword, 10)
    const newAdmin = await db.admin.create({
      data: {
        email: data.email,
        passwordHash: hashedPassword,
        name: data.name,
        avatar: data.avatar || null,
        role: data.role || 'editor',
        isActive: data.isActive ?? true,
      },
    })
    await logAudit({
      adminId: admin.id,
      action: 'create',
      entity: 'admin',
      entityId: newAdmin.id,
      ipAddress: getClientIp(request),
      changes: { email: data.email, name: data.name, role: data.role || 'editor' },
    })
    return NextResponse.json({
      id: newAdmin.id,
      email: newAdmin.email,
      name: newAdmin.name,
      role: newAdmin.role,
      isActive: newAdmin.isActive,
      createdAt: newAdmin.createdAt,
    }, { status: 201 })
  } catch (error) {
    console.error('Admin create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

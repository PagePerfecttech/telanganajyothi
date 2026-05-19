import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { logAudit, getClientIp } from '@/lib/audit'

export async function GET() {
  try {
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
    const data = await request.json()
    const plainPassword = data.password || 'password123'
    const hashedPassword = await bcrypt.hash(plainPassword, 10)
    const admin = await db.admin.create({
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
      adminId: data.createdBy || data.adminId || 'system',
      action: 'create',
      entity: 'admin',
      entityId: admin.id,
      ipAddress: getClientIp(request),
      changes: { email: data.email, name: data.name, role: data.role || 'editor' },
    })
    return NextResponse.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
    }, { status: 201 })
  } catch (error) {
    console.error('Admin create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

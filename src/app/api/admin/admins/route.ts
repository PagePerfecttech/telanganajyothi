import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'
import { z } from 'zod'

const createAdminSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  name: z.string().min(1, 'Name is required').max(100),
  password: z.string().min(12, 'Password must be at least 12 characters').optional(),
  role: z.enum(['admin', 'editor', 'moderator']).default('editor'),
  avatar: z.string().url('Invalid avatar URL').optional().nullable(),
  isActive: z.boolean().default(true),
})

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
    
    // Validate input
    const parsed = createAdminSchema.safeParse(data)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const validatedData = parsed.data
    
    // Check if email already exists
    const existingAdmin = await db.admin.findUnique({ where: { email: validatedData.email } })
    if (existingAdmin) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const plainPassword = validatedData.password || Math.random().toString(36).slice(2, 14) + 'A1!'
    const hashedPassword = await bcrypt.hash(plainPassword, 10)
    
    const newAdmin = await db.admin.create({
      data: {
        email: validatedData.email,
        passwordHash: hashedPassword,
        name: validatedData.name,
        avatar: validatedData.avatar || null,
        role: validatedData.role,
        isActive: validatedData.isActive,
      },
    })
    
    await logAudit({
      adminId: admin.id,
      action: 'create',
      entity: 'admin',
      entityId: newAdmin.id,
      ipAddress: getClientIp(request),
      changes: { email: validatedData.email, name: validatedData.name, role: validatedData.role },
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

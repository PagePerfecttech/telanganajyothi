import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'

export async function GET() {
  try {
    const states = await db.state.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { districts: { where: { deletedAt: null } }, news: { where: { deletedAt: null } } } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(states)
  } catch (error) {
    console.error('States list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const state = await db.state.create({
      data: {
        name: data.name,
        code: data.code,
        isActive: data.isActive ?? true,
      },
    })
    await logAudit({
      adminId: data.createdBy || data.adminId || 'system',
      action: 'create',
      entity: 'state',
      entityId: state.id,
      ipAddress: getClientIp(request),
      changes: { name: data.name, code: data.code },
    })
    return NextResponse.json(state, { status: 201 })
  } catch (error) {
    console.error('State create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { id, ...updateData } = data

    if (!id) {
      return NextResponse.json({ error: 'State ID is required' }, { status: 400 })
    }

    const state = await db.state.update({
      where: { id },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.code !== undefined && { code: updateData.code }),
        ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
      },
    })
    await logAudit({
      adminId: data.updatedBy || data.adminId || 'system',
      action: 'update',
      entity: 'state',
      entityId: id,
      ipAddress: getClientIp(request),
      changes: updateData,
    })
    return NextResponse.json(state)
  } catch (error) {
    console.error('State update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

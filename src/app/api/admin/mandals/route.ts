import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const districtId = searchParams.get('districtId')
    const stateId = searchParams.get('stateId')

    const where: Record<string, unknown> = { deletedAt: null }
    if (districtId) {
      where.districtId = districtId
    }
    if (stateId) {
      where.district = { stateId }
    }

    const mandals = await db.mandal.findMany({
      where,
      include: {
        district: { select: { name: true, state: { select: { name: true, code: true } } } },
        _count: { select: { news: { where: { deletedAt: null } } } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(mandals)
  } catch (error) {
    console.error('Mandals list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const data = await request.json()

    if (Array.isArray(data)) {
      const mandals = await db.mandal.createMany({ data: data.map((d: { name: string; districtId: string; isActive?: boolean }) => ({ name: d.name, districtId: d.districtId, isActive: d.isActive ?? true })) })
      await logAudit({
        adminId: admin.id,
        action: 'create',
        entity: 'mandal',
        ipAddress: getClientIp(request),
        changes: { count: data.length, names: data.map((d: { name: string }) => d.name) },
      })
      return NextResponse.json(mandals, { status: 201 })
    }

    const mandal = await db.mandal.create({
      data: {
        name: data.name,
        districtId: data.districtId,
        isActive: data.isActive ?? true,
      },
    })
    await logAudit({
      adminId: admin.id,
      action: 'create',
      entity: 'mandal',
      entityId: mandal.id,
      ipAddress: getClientIp(request),
      changes: { name: data.name, districtId: data.districtId },
    })
    return NextResponse.json(mandal, { status: 201 })
  } catch (error) {
    console.error('Mandal create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const data = await request.json()
    const { id, ...updateData } = data

    if (!id) {
      return NextResponse.json({ error: 'Mandal ID is required' }, { status: 400 })
    }

    const mandal = await db.mandal.update({
      where: { id },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.districtId !== undefined && { districtId: updateData.districtId }),
        ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
      },
    })
    await logAudit({
      adminId: admin.id,
      action: 'update',
      entity: 'mandal',
      entityId: id,
      ipAddress: getClientIp(request),
      changes: updateData,
    })
    return NextResponse.json(mandal)
  } catch (error) {
    console.error('Mandal update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const data = await request.json()
    const { id } = data

    if (!id) {
      return NextResponse.json({ error: 'Mandal ID is required' }, { status: 400 })
    }

    await db.mandal.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })
    await logAudit({
      adminId: admin.id,
      action: 'delete',
      entity: 'mandal',
      entityId: id,
      ipAddress: getClientIp(request),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mandal delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

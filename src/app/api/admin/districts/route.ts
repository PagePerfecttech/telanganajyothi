import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stateId = searchParams.get('stateId')

    const where: Record<string, unknown> = { deletedAt: null }
    if (stateId) where.stateId = stateId

    const districts = await db.district.findMany({
      where,
      include: {
        state: { select: { name: true, code: true } },
        _count: { select: { news: { where: { deletedAt: null } } } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(districts)
  } catch (error) {
    console.error('Districts list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    if (Array.isArray(data)) {
      const districts = await db.district.createMany({ data: data.map((d: { name: string; stateId: string; isActive?: boolean }) => ({ name: d.name, stateId: d.stateId, isActive: d.isActive ?? true })) })
      await logAudit({
        adminId: data[0]?.createdBy || data[0]?.adminId || 'system',
        action: 'create',
        entity: 'district',
        ipAddress: getClientIp(request),
        changes: { count: data.length, names: data.map((d: { name: string }) => d.name) },
      })
      return NextResponse.json(districts, { status: 201 })
    }

    const district = await db.district.create({
      data: {
        name: data.name,
        stateId: data.stateId,
        isActive: data.isActive ?? true,
      },
    })
    await logAudit({
      adminId: data.createdBy || data.adminId || 'system',
      action: 'create',
      entity: 'district',
      entityId: district.id,
      ipAddress: getClientIp(request),
      changes: { name: data.name, stateId: data.stateId },
    })
    return NextResponse.json(district, { status: 201 })
  } catch (error) {
    console.error('District create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { id, ...updateData } = data

    if (!id) {
      return NextResponse.json({ error: 'District ID is required' }, { status: 400 })
    }

    const district = await db.district.update({
      where: { id },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.stateId !== undefined && { stateId: updateData.stateId }),
        ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
      },
    })
    await logAudit({
      adminId: data.updatedBy || data.adminId || 'system',
      action: 'update',
      entity: 'district',
      entityId: id,
      ipAddress: getClientIp(request),
      changes: updateData,
    })
    return NextResponse.json(district)
  } catch (error) {
    console.error('District update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const data = await request.json()
    const { id } = data

    if (!id) {
      return NextResponse.json({ error: 'District ID is required' }, { status: 400 })
    }

    const district = await db.district.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })
    await logAudit({
      adminId: 'system',
      action: 'delete',
      entity: 'district',
      entityId: id,
      ipAddress: getClientIp(request),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('District delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

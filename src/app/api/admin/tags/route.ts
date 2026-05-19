import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const tags = await db.tag.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { news: true } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(tags)
  } catch (error) {
    console.error('Tags list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const data = await request.json()
    const tag = await db.tag.create({
      data: {
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
        type: data.type || 'topic',
        isTrending: data.isTrending ?? false,
        isActive: data.isActive ?? true,
      },
    })
    await logAudit({
      adminId: admin.id,
      action: 'create',
      entity: 'tag',
      entityId: tag.id,
      ipAddress: getClientIp(request),
      changes: { name: data.name, slug: data.slug, type: data.type },
    })
    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    console.error('Tag create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

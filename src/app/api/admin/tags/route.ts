import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'

export async function GET() {
  try {
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
      adminId: data.createdBy || data.adminId || 'system',
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

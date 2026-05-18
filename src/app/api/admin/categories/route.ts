import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { news: { where: { deletedAt: null } } } } },
    })
    // Return simplified response with single `name` field
    const simplified = categories.map(c => ({
      ...c,
      name: c.nameEn,
    }))
    return NextResponse.json(simplified)
  } catch (error) {
    console.error('Categories list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    // Accept `name` and store in both En/Te fields
    const name = data.name || data.nameEn || ''
    const category = await db.category.create({
      data: {
        nameEn: name,
        nameTe: data.nameTe || name,
        slug: data.slug,
        iconUrl: data.iconUrl || null,
        color: data.color || null,
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive ?? true,
      },
    })
    return NextResponse.json({ ...category, name: category.nameEn }, { status: 201 })
  } catch (error) {
    console.error('Category create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

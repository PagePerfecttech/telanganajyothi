import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { news: true } } },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Categories list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const category = await db.category.create({
      data: {
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
        iconUrl: data.iconUrl || null,
        color: data.color || null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Category create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

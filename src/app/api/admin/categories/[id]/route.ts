import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const category = await db.category.findUnique({ where: { id, deletedAt: null } })
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json(category)
  } catch (error) {
    console.error('Category get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    // Accept `name` and store in both En/Te fields
    const name = data.name || data.nameEn || ''
    const category = await db.category.update({
      where: { id },
      data: {
        nameEn: name,
        nameTe: data.nameTe || name,
        slug: data.slug,
        iconUrl: data.iconUrl || null,
        color: data.color || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    })
    return NextResponse.json(category)
  } catch (error) {
    console.error('Category update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.category.update({ where: { id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Category delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

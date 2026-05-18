import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    const tag = await db.tag.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        type: data.type,
        isTrending: data.isTrending,
        isActive: data.isActive,
      },
    })
    return NextResponse.json(tag)
  } catch (error) {
    console.error('Tag update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.tag.update({ where: { id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tag delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

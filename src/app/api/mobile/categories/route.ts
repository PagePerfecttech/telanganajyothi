import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
        name: true,
        iconUrl: true,
        color: true,
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Categories error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

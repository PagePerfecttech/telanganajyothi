import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    const where: any = {}
    if (status) where.status = status

    const withdrawals = await db.withdrawalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { name: true, phone: true, district: { select: { name: true } } }
        }
      }
    })

    const formattedWithdrawals = withdrawals.map(w => ({
      ...w,
      reporter: {
        name: w.reporter.name,
        phone: w.reporter.phone,
        district: w.reporter.district?.name || 'Unknown'
      }
    }))

    return NextResponse.json(formattedWithdrawals)
  } catch (error) {
    console.error('Admin withdrawals list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

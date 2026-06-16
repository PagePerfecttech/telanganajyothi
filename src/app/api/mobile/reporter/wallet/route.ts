import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseAuth } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyFirebaseAuth(token)
    
    if (!decodedToken || !decodedToken.phone_number) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reporter = await db.reporter.findUnique({
      where: { phone: decodedToken.phone_number },
      include: {
        walletTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        withdrawalRequests: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        }
      }
    })

    if (!reporter) {
      return NextResponse.json({ error: 'Reporter not found' }, { status: 404 })
    }

    const rateSetting = await db.setting.findUnique({ where: { key: 'COIN_TO_MONEY_RATE' } })
    const conversionRate = rateSetting ? parseFloat(rateSetting.value) : 0.01 // Default: 1 coin = 0.01 INR (100 coins = 1 INR)

    return NextResponse.json({
      balance: reporter.coinsBalance,
      conversionRate,
      transactions: reporter.walletTransactions,
      withdrawals: reporter.withdrawalRequests
    })
  } catch (error) {
    console.error('Wallet get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

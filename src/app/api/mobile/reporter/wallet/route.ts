import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(authHeader);
    } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
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

    const rateSetting = await db.setting.findUnique({ where: { key: 'COINS_PER_INR' } })
    const coinsPerInr = rateSetting && !isNaN(parseFloat(rateSetting.value)) ? parseFloat(rateSetting.value) : 100 // Default: 100 coins = 1 INR
    const conversionRate = 1 / coinsPerInr

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

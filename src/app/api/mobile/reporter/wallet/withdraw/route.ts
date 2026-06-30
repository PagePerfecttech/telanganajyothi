import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
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
      where: { phone: decodedToken.phone_number }
    })

    if (!reporter) {
      return NextResponse.json({ error: 'Reporter not found' }, { status: 404 })
    }

    const data = await request.json()
    const { coins, upiId } = data

    if (!coins || isNaN(coins) || coins <= 0) {
      return NextResponse.json({ error: 'Invalid coin amount' }, { status: 400 })
    }

    if (!upiId || typeof upiId !== 'string') {
      return NextResponse.json({ error: 'Invalid UPI ID' }, { status: 400 })
    }

    if (reporter.coinsBalance < coins) {
      return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 })
    }

    const rateSetting = await db.setting.findUnique({ where: { key: 'COINS_PER_INR' } })
    const coinsPerInr = rateSetting && !isNaN(parseFloat(rateSetting.value)) ? parseFloat(rateSetting.value) : 100 // Default: 100 coins = 1 INR
    const conversionRate = 1 / coinsPerInr

    const moneyAmount = coins * conversionRate

    const withdrawal = await db.$transaction(async (tx) => {
      // Create request
      const req = await tx.withdrawalRequest.create({
        data: {
          reporterId: reporter.id,
          coinsAmount: coins,
          moneyAmount,
          upiId,
          status: 'pending'
        }
      })

      // Deduct from balance
      await tx.reporter.update({
        where: { id: reporter.id },
        data: { coinsBalance: { decrement: coins } }
      })

      // Log transaction
      await tx.walletTransaction.create({
        data: {
          reporterId: reporter.id,
          amount: coins,
          type: 'DEBIT',
          description: `Withdrawal request to UPI ${upiId}`,
          referenceId: req.id
        }
      })

      return req
    })

    return NextResponse.json(withdrawal, { status: 201 })
  } catch (error) {
    console.error('Wallet withdraw error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

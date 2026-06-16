import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { logAudit, getClientIp } from '@/lib/audit'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const data = await request.json()
    const { status, adminNotes } = data

    if (!['pending', 'processing', 'completed', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const withdrawal = await db.withdrawalRequest.findUnique({ where: { id } })
    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }

    const updateData: any = { status }
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes

    const updated = await db.$transaction(async (tx) => {
      const res = await tx.withdrawalRequest.update({
        where: { id },
        data: updateData
      })

      // If rejected, refund the coins
      if (status === 'rejected' && withdrawal.status !== 'rejected') {
        await tx.reporter.update({
          where: { id: withdrawal.reporterId },
          data: { coinsBalance: { increment: withdrawal.coinsAmount } }
        })
        await tx.walletTransaction.create({
          data: {
            reporterId: withdrawal.reporterId,
            amount: withdrawal.coinsAmount,
            type: 'CREDIT',
            description: 'Refund for rejected withdrawal request',
            referenceId: withdrawal.id
          }
        })
      }

      return res
    })

    await logAudit({
      adminId: admin.id,
      action: `withdrawal_${status}`,
      entity: 'withdrawal',
      entityId: id,
      ipAddress: getClientIp(request),
      changes: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Admin withdrawal update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

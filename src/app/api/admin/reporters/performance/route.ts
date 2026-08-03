import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'
import { issueReporterWarning, flagReporterFakeNews, checkReporterPromotionEligibility } from '@/lib/scoring-service'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reporters = await db.reporter.findMany({
      where: { deletedAt: null },
      include: {
        district: { select: { name: true } },
        mandal: { select: { name: true } },
        _count: { select: { news: { where: { deletedAt: null } } } },
      },
      orderBy: [
        { promotionStatus: 'asc' },
        { performanceScore: 'desc' },
      ],
    })

    // Calculate sum of total views per reporter
    const reportersWithStats = await Promise.all(
      reporters.map(async (reporter) => {
        const viewsResult = await db.news.aggregate({
          where: { reporterId: reporter.id, deletedAt: null },
          _sum: { viewsCount: true },
        })
        const totalViews = viewsResult._sum.viewsCount || 0

        return {
          id: reporter.id,
          name: reporter.name,
          phone: reporter.phone,
          email: reporter.email,
          avatar: reporter.avatar,
          role: reporter.role || (reporter.canPublishDirectly ? 'senior' : 'junior'),
          status: reporter.status,
          performanceScore: reporter.performanceScore || 0,
          approvedArticles: reporter.approvedArticles || 0,
          rejectedArticles: reporter.rejectedArticles || 0,
          fakeNewsCount: reporter.fakeNewsCount || 0,
          warningCount: reporter.warningCount || 0,
          promotionStatus: reporter.promotionStatus || 'none',
          earningsBalance: reporter.earningsBalance || 0,
          totalViews,
          district: reporter.district?.name || null,
          mandal: reporter.mandal?.name || null,
          createdAt: reporter.createdAt,
        }
      })
    )

    return NextResponse.json(reportersWithStats)
  } catch (error) {
    console.error('Reporter performance list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { reporterId, action, reason } = body

    if (!reporterId || !action) {
      return NextResponse.json({ error: 'Reporter ID and action are required' }, { status: 400 })
    }

    const reporter = await db.reporter.findUnique({ where: { id: reporterId } })
    if (!reporter) {
      return NextResponse.json({ error: 'Reporter not found' }, { status: 404 })
    }

    let updatedReporter: Record<string, unknown> = {}

    switch (action) {
      case 'promote':
        updatedReporter = await db.reporter.update({
          where: { id: reporterId },
          data: {
            role: 'senior',
            canPublishDirectly: true,
            promotionStatus: 'promoted',
          },
        })
        break

      case 'demote':
        updatedReporter = await db.reporter.update({
          where: { id: reporterId },
          data: {
            role: 'junior',
            canPublishDirectly: false,
            promotionStatus: 'demoted',
          },
        })
        break

      case 'warning':
        await issueReporterWarning(reporterId, reason)
        updatedReporter = (await db.reporter.findUnique({ where: { id: reporterId } })) || {}
        break

      case 'fake_news':
        await flagReporterFakeNews(reporterId)
        updatedReporter = (await db.reporter.findUnique({ where: { id: reporterId } })) || {}
        break

      case 'dismiss_recommendation':
        updatedReporter = await db.reporter.update({
          where: { id: reporterId },
          data: { promotionStatus: 'none' },
        })
        break

      case 'hold':
        updatedReporter = await db.reporter.update({
          where: { id: reporterId },
          data: { status: 'hold' },
        })
        break

      case 'activate':
        updatedReporter = await db.reporter.update({
          where: { id: reporterId },
          data: { status: 'active' },
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await logAudit({
      adminId: admin.id,
      action: 'update',
      entity: 'reporter_performance',
      entityId: reporterId,
      ipAddress: getClientIp(request),
      changes: { action, reason, reporterName: reporter.name },
    })

    await checkReporterPromotionEligibility(reporterId)

    return NextResponse.json({ success: true, reporter: updatedReporter })
  } catch (error) {
    console.error('Reporter performance action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

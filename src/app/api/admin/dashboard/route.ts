import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const [
      totalNews,
      activeUsers,
      pendingReviews,
      activeReporters,
      publishedToday,
      totalViews,
    ] = await Promise.all([
      db.news.count({ where: { deletedAt: null } }),
      db.user.count({ where: { isActive: true, deletedAt: null } }),
      db.news.count({ where: { status: 'pending_review', deletedAt: null } }),
      db.reporter.count({ where: { status: 'active', deletedAt: null } }),
      db.news.count({
        where: {
          status: 'published',
          publishedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          deletedAt: null,
        },
      }),
      db.news.aggregate({ _sum: { viewsCount: true }, where: { deletedAt: null } }),
    ])

    // News by category
    const newsByCategory = await db.news.groupBy({
      by: ['categoryId'],
      where: { deletedAt: null },
      _count: { id: true },
    })

    const categories = await db.category.findMany({ where: { deletedAt: null } })
    const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

    const newsByCategoryData = newsByCategory.map((item) => ({
      categoryId: item.categoryId,
      categoryName: categoryMap[item.categoryId]?.name || 'Unknown',
      count: item._count.id,
    }))

    // News published this week (by day)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recentNews = await db.news.findMany({
      where: { publishedAt: { gte: weekAgo }, deletedAt: null },
      select: { publishedAt: true },
    })

    const dayMap: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dayMap[key] = 0
    }
    for (const n of recentNews) {
      if (n.publishedAt) {
        const key = n.publishedAt.toISOString().split('T')[0]
        if (key in dayMap) dayMap[key]++
      }
    }

    const weeklyData = Object.entries(dayMap).map(([date, count]) => ({ date, count }))

    // Recent activity
    const recentAuditLogs = await db.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { name: true } } },
    })

    return NextResponse.json({
      kpis: {
        totalNews,
        activeUsers,
        pendingReviews,
        activeReporters,
        publishedToday,
        totalViews: totalViews._sum.viewsCount || 0,
      },
      newsByCategory: newsByCategoryData,
      weeklyData,
      recentActivity: recentAuditLogs,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

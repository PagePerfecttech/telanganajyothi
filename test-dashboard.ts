import { db } from './src/lib/db';

async function test() {
  try {
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
    console.log('Queries successful:', { totalNews, activeUsers, pendingReviews, activeReporters, publishedToday, totalViews });

    const newsByCategory = await db.news.groupBy({
      by: ['categoryId'],
      where: { deletedAt: null },
      _count: { id: true },
    })
    console.log('newsByCategory:', newsByCategory);

    const categories = await db.category.findMany({ where: { deletedAt: null } })
    console.log('categories count:', categories.length);

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recentNews = await db.news.findMany({
      where: { publishedAt: { gte: weekAgo }, deletedAt: null },
      select: { publishedAt: true },
    })
    console.log('recentNews count:', recentNews.length);

    const recentAuditLogs = await db.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { name: true } } },
    })
    console.log('recentAuditLogs count:', recentAuditLogs.length);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

test();

import { db } from './src/lib/db';

async function auditDB() {
  console.log("Starting DB Audit...");
  
  try {
    // 1. Check basic connectivity
    await db.$queryRaw`SELECT 1`;
    console.log("✅ DB Connection successful");

    // 2. Count records in all major tables
    const counts = {
      states: await db.state.count(),
      districts: await db.district.count(),
      categories: await db.category.count(),
      tags: await db.tag.count(),
      admins: await db.admin.count(),
      reporters: await db.reporter.count(),
      users: await db.user.count(),
      news: await db.news.count(),
      videos: await db.video.count(),
      auditLogs: await db.auditLog.count()
    };
    
    console.log("📊 Table Counts:", counts);

    // 3. Check for orphaned AuditLogs
    if (counts.auditLogs > 0) {
      const allAuditLogs = await db.auditLog.findMany({ select: { id: true, adminId: true } });
      const allAdmins = await db.admin.findMany({ select: { id: true } });
      const adminIds = new Set(allAdmins.map(a => a.id));
      
      const orphanedLogs = allAuditLogs.filter(log => !adminIds.has(log.adminId));
      if (orphanedLogs.length > 0) {
        console.error(`❌ FOUND ${orphanedLogs.length} ORPHANED AUDIT LOGS! This will crash the dashboard.`);
        console.log("Orphaned log IDs:", orphanedLogs.map(l => l.id));
      } else {
        console.log("✅ No orphaned audit logs found.");
      }
    } else {
      console.log("ℹ️ No audit logs to check.");
    }

    // 4. Check for orphaned News (missing category, state, reporter, admin)
    if (counts.news > 0) {
       const orphanedNews = await db.news.findMany({
          where: {
             OR: [
                { category: { is: null } },
                { state: { is: null } },
                { admin: { is: null } }
             ]
          }
       });
       if (orphanedNews.length > 0) {
          console.error(`❌ FOUND ${orphanedNews.length} ORPHANED NEWS RECORDS!`);
       } else {
          console.log("✅ No orphaned news records found.");
       }
    }

  } catch (error) {
    console.error("❌ DB Audit failed with error:", error);
  } finally {
    await db.$disconnect();
  }
}

auditDB();

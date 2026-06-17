import { db } from './src/lib/db';

async function testBigInt() {
  try {
    // Check type of _sum
    const state = await db.state.findFirst();
    if (!state) {
        console.log("No state found");
        return;
    }
    const cat = await db.category.findFirst();
    if (!cat) {
        console.log("No category found");
        return;
    }
    const admin = await db.admin.findFirst();
    if (!admin) {
        console.log("No admin found");
        return;
    }

    const news = await db.news.create({
      data: {
        title: "Test",
        categoryId: cat.id,
        stateId: state.id,
        thumbnailUrl: "test",
        createdBy: admin.id,
        viewsCount: 10
      }
    });
    
    const totalViews = await db.news.aggregate({ _sum: { viewsCount: true }, where: { deletedAt: null } });
    console.log('totalViews._sum.viewsCount typeof:', typeof totalViews._sum.viewsCount);
    
    console.log('stringify test:', JSON.stringify(totalViews._sum.viewsCount || 0));

    await db.news.delete({ where: { id: news.id } });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

testBigInt();

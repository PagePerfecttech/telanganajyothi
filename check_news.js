const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  const states = await prisma.state.findMany({ select: { id: true, name: true } });
  const admins = await prisma.admin.findMany({ select: { id: true, name: true } });
  console.log('Categories:', categories);
  console.log('States:', states);
  console.log('Admins:', admins);
}
main().catch(console.error).finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const districts = await prisma.district.findMany({ include: { assemblies: true } });
  console.log(`Total districts: ${districts.length}`);
  
  const noAssembly = districts.filter(d => d.assemblies.length === 0);
  console.log(`Districts with no assembly: ${noAssembly.map(d => d.name).join(', ')}`);
  
  const duplicates = districts.reduce((acc, d) => {
    acc[d.name] = (acc[d.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const duplicateNames = Object.keys(duplicates).filter(k => duplicates[k] > 1);
  console.log(`Duplicate districts: ${duplicateNames.join(', ')}`);
}

main().finally(() => prisma.$disconnect());

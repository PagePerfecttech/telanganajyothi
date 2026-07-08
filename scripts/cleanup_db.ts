import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting cleanup...');

  // 1. Clean up duplicate districts
  const allDistricts = await prisma.district.findMany({
    include: {
      mandals: true,
      assemblies: true,
      news: true,
      reporters: true,
      users: true,
    }
  });

  const districtGroups: Record<string, typeof allDistricts> = {};
  for (const d of allDistricts) {
    const key = `${d.stateId}-${d.name.toLowerCase().trim()}`;
    if (!districtGroups[key]) districtGroups[key] = [];
    districtGroups[key].push(d);
  }

  for (const key in districtGroups) {
    const group = districtGroups[key];
    if (group.length > 1) {
      console.log(`Found duplicate districts for ${group[0].name}. Count: ${group.length}`);
      
      // Keep the one with the most mandals, or the oldest
      group.sort((a, b) => b.mandals.length - a.mandals.length || a.createdAt.getTime() - b.createdAt.getTime());
      
      const keep = group[0];
      const remove = group.slice(1);
      
      for (const toRemove of remove) {
        console.log(`Merging district ${toRemove.id} into ${keep.id}`);
        // Move mandals
        await prisma.mandal.updateMany({
          where: { districtId: toRemove.id },
          data: { districtId: keep.id }
        });
        // Move assemblies
        await prisma.assembly.updateMany({
          where: { districtId: toRemove.id },
          data: { districtId: keep.id }
        });
        // Move news
        await prisma.news.updateMany({
          where: { districtId: toRemove.id },
          data: { districtId: keep.id }
        });
        // Move reporters
        await prisma.reporter.updateMany({
          where: { districtId: toRemove.id },
          data: { districtId: keep.id }
        });
        // Move users
        await prisma.user.updateMany({
          where: { districtId: toRemove.id },
          data: { districtId: keep.id }
        });
        
        // Delete the duplicate district
        await prisma.district.delete({ where: { id: toRemove.id } });
        console.log(`Deleted district ${toRemove.id}`);
      }
    }
  }

  // 2. Clean up duplicate mandals
  const allMandals = await prisma.mandal.findMany({
    include: {
      villages: true,
      news: true,
      reporters: true,
      users: true,
    }
  });

  const mandalGroups: Record<string, typeof allMandals> = {};
  for (const m of allMandals) {
    const key = `${m.districtId}-${m.name.toLowerCase().trim()}`;
    if (!mandalGroups[key]) mandalGroups[key] = [];
    mandalGroups[key].push(m);
  }

  for (const key in mandalGroups) {
    const group = mandalGroups[key];
    if (group.length > 1) {
      console.log(`Found duplicate mandals for ${group[0].name}. Count: ${group.length}`);
      
      group.sort((a, b) => b.villages.length - a.villages.length || a.createdAt.getTime() - b.createdAt.getTime());
      
      const keep = group[0];
      const remove = group.slice(1);
      
      for (const toRemove of remove) {
        // Move villages
        await prisma.village.updateMany({
          where: { mandalId: toRemove.id },
          data: { mandalId: keep.id }
        });
        // Move news
        await prisma.news.updateMany({
          where: { mandalId: toRemove.id },
          data: { mandalId: keep.id }
        });
        // Move reporters
        await prisma.reporter.updateMany({
          where: { mandalId: toRemove.id },
          data: { mandalId: keep.id }
        });
        // Move users
        await prisma.user.updateMany({
          where: { mandalId: toRemove.id },
          data: { mandalId: keep.id }
        });
        
        // Delete the duplicate mandal
        await prisma.mandal.delete({ where: { id: toRemove.id } });
        console.log(`Deleted mandal ${toRemove.id}`);
      }
    }
  }

  // 3. Ensure every district has an assembly and every mandal is linked to it
  const remainingDistricts = await prisma.district.findMany({ include: { assemblies: true } });
  for (const district of remainingDistricts) {
    let assembly = await prisma.assembly.findFirst({
      where: { name: `${district.name} Assembly`, districtId: district.id }
    });

    if (!assembly) {
      assembly = await prisma.assembly.create({
        data: {
          name: `${district.name} Assembly`,
          districtId: district.id,
          isActive: true
        }
      });
      console.log(`Created missing assembly for ${district.name}`);
    }

    // Link unlinked mandals to this assembly
    await prisma.mandal.updateMany({
      where: { districtId: district.id, assemblyId: null },
      data: { assemblyId: assembly.id }
    });
  }

  console.log('Cleanup completed successfully!');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

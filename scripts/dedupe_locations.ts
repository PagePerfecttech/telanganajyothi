import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function dedupeLocations() {
  console.log('🔍 Auditing & Deduplicating Database Locations...')

  // 1. Deduplicate States
  const states = await prisma.state.findMany({ where: { deletedAt: null } })
  const stateGroup: Record<string, typeof states> = {}
  for (const s of states) {
    const key = s.name.trim().toLowerCase()
    if (!stateGroup[key]) stateGroup[key] = []
    stateGroup[key].push(s)
  }

  for (const key of Object.keys(stateGroup)) {
    const list = stateGroup[key]
    if (list.length > 1) {
      const canonical = list[0]
      const duplicates = list.slice(1)
      console.log(`Found ${duplicates.length} duplicate State entries for "${canonical.name}". Merging...`)

      for (const dup of duplicates) {
        await prisma.district.updateMany({ where: { stateId: dup.id }, data: { stateId: canonical.id } }).catch(() => {})
        await prisma.news.updateMany({ where: { stateId: dup.id }, data: { stateId: canonical.id } }).catch(() => {})
        await prisma.reporter.updateMany({ where: { stateId: dup.id }, data: { stateId: canonical.id } }).catch(() => {})
        await prisma.user.updateMany({ where: { stateId: dup.id }, data: { stateId: canonical.id } }).catch(() => {})
        await prisma.state.delete({ where: { id: dup.id } }).catch(() => {})
      }
    }
  }

  // 2. Deduplicate Districts
  const districts = await prisma.district.findMany({ where: { deletedAt: null } })
  const districtGroup: Record<string, typeof districts> = {}
  for (const d of districts) {
    const key = `${d.stateId}:${d.name.trim().toLowerCase()}`
    if (!districtGroup[key]) districtGroup[key] = []
    districtGroup[key].push(d)
  }

  for (const key of Object.keys(districtGroup)) {
    const list = districtGroup[key]
    if (list.length > 1) {
      const canonical = list[0]
      const duplicates = list.slice(1)
      console.log(`Found ${duplicates.length} duplicate District entries for "${canonical.name}". Merging...`)

      for (const dup of duplicates) {
        await prisma.mandal.updateMany({ where: { districtId: dup.id }, data: { districtId: canonical.id } }).catch(() => {})
        await prisma.assembly.updateMany({ where: { districtId: dup.id }, data: { districtId: canonical.id } }).catch(() => {})
        await prisma.news.updateMany({ where: { districtId: dup.id }, data: { districtId: canonical.id } }).catch(() => {})
        await prisma.reporter.updateMany({ where: { districtId: dup.id }, data: { districtId: canonical.id } }).catch(() => {})
        await prisma.user.updateMany({ where: { districtId: dup.id }, data: { stateId: canonical.stateId, districtId: canonical.id } }).catch(() => {})
        await prisma.district.delete({ where: { id: dup.id } }).catch(() => {})
      }
    }
  }

  // 3. Deduplicate Mandals
  const mandals = await prisma.mandal.findMany({ where: { deletedAt: null } })
  const mandalGroup: Record<string, typeof mandals> = {}
  for (const m of mandals) {
    const key = `${m.districtId}:${m.name.trim().toLowerCase()}`
    if (!mandalGroup[key]) mandalGroup[key] = []
    mandalGroup[key].push(m)
  }

  for (const key of Object.keys(mandalGroup)) {
    const list = mandalGroup[key]
    if (list.length > 1) {
      const canonical = list[0]
      const duplicates = list.slice(1)
      console.log(`Found ${duplicates.length} duplicate Mandal entries for "${canonical.name}". Merging...`)

      for (const dup of duplicates) {
        await prisma.village.updateMany({ where: { mandalId: dup.id }, data: { mandalId: canonical.id } }).catch(() => {})
        await prisma.news.updateMany({ where: { mandalId: dup.id }, data: { mandalId: canonical.id } }).catch(() => {})
        await prisma.reporter.updateMany({ where: { mandalId: dup.id }, data: { mandalId: canonical.id } }).catch(() => {})
        await prisma.user.updateMany({ where: { mandalId: dup.id }, data: { mandalId: canonical.id } }).catch(() => {})
        await prisma.mandal.delete({ where: { id: dup.id } }).catch(() => {})
      }
    }
  }

  // 4. Backfill news posts missing location fields to their canonical district/mandal
  const newsWithoutLocation = await prisma.news.findMany({
    where: {
      OR: [
        { mandalId: null },
        { districtId: null },
      ]
    }
  }).catch(() => [])

  console.log(`Found ${newsWithoutLocation.length} news items requiring location backfill. Processing...`)
  for (const item of newsWithoutLocation) {
    if (item.stateId) {
      const defaultDistrict = await prisma.district.findFirst({
        where: { stateId: item.stateId, isActive: true, deletedAt: null },
        include: { mandals: true }
      }).catch(() => null)

      if (defaultDistrict) {
        const defaultMandal = defaultDistrict.mandals[0]
        await prisma.news.update({
          where: { id: item.id },
          data: {
            districtId: item.districtId || defaultDistrict.id,
            mandalId: item.mandalId || (defaultMandal ? defaultMandal.id : null),
          }
        }).catch(() => {})
      }
    }
  }

  console.log('🎉 Location deduplication and news re-linking completed!')
}

dedupeLocations()
  .catch((e) => {
    console.error('Deduplication error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

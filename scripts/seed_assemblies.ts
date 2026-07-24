/// <reference types="node" />
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Migrating existing locations into District -> Assembly -> Mandal -> Village hierarchy...')

  // 1. Fetch all districts
  const districts = await prisma.district.findMany()

  for (const district of districts) {
    // Check if an assembly already exists for this district
    let assembly = await prisma.assembly.findFirst({
      where: { name: `${district.name} Assembly`, districtId: district.id }
    })

    if (!assembly) {
      assembly = await prisma.assembly.create({
        data: {
          name: `${district.name} Assembly`,
          districtId: district.id,
          isActive: true
        }
      })
      console.log(`✅ Created Assembly: ${assembly.name}`)
    }

    // 2. Fetch all mandals in this district
    const mandals = await prisma.mandal.findMany({
      where: { districtId: district.id }
    })

    for (const mandal of mandals) {
      // Link mandal to the assembly
      await prisma.mandal.update({
        where: { id: mandal.id },
        data: { assemblyId: assembly.id }
      })

      // Create 2 dummy villages for each mandal if not exists
      const villageNames = [`${mandal.name} Rural`, `${mandal.name} Urban`]
      for (const vName of villageNames) {
        const existingVillage = await prisma.village.findFirst({
          where: { name: vName, mandalId: mandal.id }
        })

        if (!existingVillage) {
          const village = await prisma.village.create({
            data: {
              name: vName,
              mandalId: mandal.id,
              isActive: true
            }
          })
          console.log(`   - Created Village: ${village.name}`)
        }
      }
    }
  }

  console.log('🎉 Location migration completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

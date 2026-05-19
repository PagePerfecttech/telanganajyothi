import { PrismaClient } from '@prisma/client'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import 'dotenv/config'

async function testDatabase() {
  console.log('Testing Database Connection...')
  const prisma = new PrismaClient()
  try {
    const adminCount = await prisma.admin.count()
    console.log(`✅ Database connected successfully! Admin Count: ${adminCount}`)
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function testR2() {
  console.log('Testing Cloudflare R2 Connection...')
  try {
    const s3Client = new S3Client({
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
      region: 'auto',
    })

    const bucket = process.env.R2_BUCKET || ''
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: 1,
    })

    await s3Client.send(command)
    console.log(`✅ Cloudflare R2 connected successfully! Bucket: ${bucket}`)
  } catch (error) {
    console.error('❌ Cloudflare R2 connection failed:', error)
  }
}

async function main() {
  console.log('=== CONNECTION TEST START ===')
  await testDatabase()
  await testR2()
  console.log('=== CONNECTION TEST END ===')
}

main()

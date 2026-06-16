import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Create Super Admin (with hashed password)
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@telanganajyothi.com' },
    update: {},
    create: {
      email: 'admin@telanganajyothi.com',
      passwordHash: hashedPassword,
      name: 'Super Admin',
      role: 'super_admin',
      isActive: true,
    },
  })
  console.log('✅ Admin created:', admin.email)

  // 3. Create Telangana State
  const telangana = await prisma.state.upsert({
    where: { code: 'TG' },
    update: {},
    create: { name: 'Telangana', code: 'TG', isActive: true },
  })
  console.log('✅ State created:', telangana.name)

  // 4. Create all 33 Telangana Districts
  const districtNames = [
    'Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad',
    'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal',
    'Kamareddy', 'Karimnagar', 'Khammam', 'Komaram Bheem Asifabad',
    'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak',
    'Medchal Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda',
    'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli',
    'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet',
    'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'
  ]
  for (const name of districtNames) {
    await prisma.district.upsert({
      where: { id: `${telangana.id}-${name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: { name, stateId: telangana.id, isActive: true },
    })
  }
  console.log(`✅ ${districtNames.length} districts created`)

  // 5. Create Categories (single language)
  const categoriesData = [
    { name: 'Politics', slug: 'politics', color: '#DC2626' },
    { name: 'Crime', slug: 'crime', color: '#7C3AED' },
    { name: 'Sports', slug: 'sports', color: '#059669' },
    { name: 'Entertainment', slug: 'entertainment', color: '#D97706' },
    { name: 'Business', slug: 'business', color: '#2563EB' },
    { name: 'Technology', slug: 'technology', color: '#0891B2' },
    { name: 'Education', slug: 'education', color: '#4F46E5' },
    { name: 'Health', slug: 'health', color: '#16A34A' },
    { name: 'Agriculture', slug: 'agriculture', color: '#65A30D' },
    { name: 'Infrastructure', slug: 'infrastructure', color: '#9333EA' },
  ]
  for (let i = 0; i < categoriesData.length; i++) {
    const cat = categoriesData[i]
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { name: cat.name, slug: cat.slug, color: cat.color, sortOrder: i, isActive: true },
    })
  }
  console.log(`✅ ${categoriesData.length} categories created`)

  // 6. Create Tags
  const tags = [
    { name: 'Elections', slug: 'elections', type: 'event' },
    { name: 'KCR', slug: 'kcr', type: 'person' },
    { name: 'Revanth Reddy', slug: 'revanth-reddy', type: 'person' },
    { name: 'Hyderabad', slug: 'hyderabad', type: 'topic' },
    { name: 'Irrigation', slug: 'irrigation', type: 'topic' },
    { name: 'IT Sector', slug: 'it-sector', type: 'topic' },
    { name: 'Farmer Loan', slug: 'farmer-loan', type: 'topic' },
    { name: 'Tollywood', slug: 'tollywood', type: 'topic' },
    { name: 'Cricket', slug: 'cricket', type: 'topic' },
    { name: 'Festivals', slug: 'festivals', type: 'event' },
  ]
  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: { name: tag.name, slug: tag.slug, type: tag.type, isTrending: Math.random() > 0.5, isActive: true },
    })
  }
  console.log(`✅ ${tags.length} tags created`)

  // 10. Create Default Settings
  const defaultSettings = [
    { key: 'admob_enabled', value: 'false', description: 'AdMob enabled' },
    { key: 'admob_banner_id', value: '', description: 'AdMob Banner Ad Unit ID' },
    { key: 'admob_interstitial_id', value: '', description: 'AdMob Interstitial Ad Unit ID' },
    { key: 'admob_native_id', value: '', description: 'AdMob Native Ad Unit ID' },
    { key: 'admob_rewarded_id', value: '', description: 'AdMob Rewarded Ad Unit ID' },
    { key: 'admob_frequency_cap', value: '5', description: 'Ad frequency cap per session' },
    { key: 'custom_banner_enabled', value: 'true', description: 'Custom banner ads enabled' },
    { key: 'custom_banner_image_url', value: 'https://placehold.co/800x100/DC2626/white?text=Telangana+Jyothi+Banner+Ad', description: 'Custom banner ad image URL' },
    { key: 'custom_banner_link_url', value: 'https://telanganajyothi.vercel.app', description: 'Custom banner ad click URL' },
    { key: 'force_update_android', value: '1.0.0', description: 'Minimum Android version' },
    { key: 'force_update_ios', value: '1.0.0', description: 'Minimum iOS version' },
    { key: 'force_update_hard_block', value: 'false', description: 'Hard block outdated apps' },
    { key: 'maintenance_mode', value: 'false', description: 'Maintenance mode enabled' },
    { key: 'maintenance_message', value: '', description: 'Maintenance mode message' },
    { key: 'feature_comments', value: 'true', description: 'Comments feature enabled' },
    { key: 'feature_dark_mode', value: 'true', description: 'Dark mode feature enabled' },
    { key: 'feature_video_section', value: 'true', description: 'Video section enabled' },
    { key: 'feature_notifications', value: 'true', description: 'Push notifications enabled' },
    { key: 'feature_bookmarks', value: 'true', description: 'Bookmarks feature enabled' },
    { key: 'feature_share', value: 'true', description: 'Share feature enabled' },
    { key: 'otp_code', value: '1234', description: 'Current OTP code for testing' },
  ]
  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log(`✅ ${defaultSettings.length} settings created`)

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

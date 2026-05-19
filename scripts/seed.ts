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

  // 2. Create Additional Admins
  const adminsData = [
    { email: 'editor@telanganajyothi.com', name: 'Rajesh Editor', role: 'editor' },
    { email: 'moderator@telanganajyothi.com', name: 'Priya Moderator', role: 'moderator' },
    { email: 'admin2@telanganajyothi.com', name: 'Suresh Admin', role: 'admin' },
  ]
  for (const a of adminsData) {
    await prisma.admin.upsert({
      where: { email: a.email },
      update: {},
      create: { email: a.email, passwordHash: hashedPassword, name: a.name, role: a.role, isActive: true },
    })
  }
  console.log(`✅ ${adminsData.length + 1} admins created`)

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

  // 7. Create Sample Reporters
  const allDistricts = await prisma.district.findMany()
  const reportersData = [
    { name: 'Ramesh Kumar', phone: '9876543210', email: 'ramesh@tjsn.com', beat: 'Politics' },
    { name: 'Lakshmi Devi', phone: '9876543211', email: 'lakshmi@tjsn.com', beat: 'Crime' },
    { name: 'Suresh Babu', phone: '9876543212', email: 'suresh@tjsn.com', beat: 'Sports' },
    { name: 'Padma Priya', phone: '9876543213', email: 'padma@tjsn.com', beat: 'Entertainment' },
    { name: 'Venkat Rao', phone: '9876543214', email: 'venkat@tjsn.com', beat: 'Business' },
    { name: 'Anitha Sharma', phone: '9876543215', email: 'anitha@tjsn.com', beat: 'Education' },
    { name: 'Krishna Murthy', phone: '9876543216', email: 'krishna@tjsn.com', beat: 'Agriculture' },
    { name: 'Sunitha Reddy', phone: '9876543217', email: 'sunitha@tjsn.com', beat: 'Health' },
  ]
  for (let i = 0; i < reportersData.length; i++) {
    const r = reportersData[i]
    const district = allDistricts[i % allDistricts.length]
    await prisma.reporter.upsert({
      where: { phone: r.phone },
      update: {},
      create: {
        name: r.name, phone: r.phone, email: r.email,
        bio: `Experienced reporter covering ${r.beat} beats in Telangana.`,
        stateId: telangana.id, districtId: district.id,
        beat: r.beat, status: 'active', canPublishDirectly: i < 2,
      },
    })
  }
  console.log(`✅ ${reportersData.length} reporters created`)

  // 8. Create Sample News (single language)
  const allCategories = await prisma.category.findMany()
  const allReporters = await prisma.reporter.findMany()
  const allTags = await prisma.tag.findMany()

  const newsTitles: Record<string, string[]> = {
    politics: [
      'CM Announces New Welfare Scheme for Farmers',
      'Assembly Session to Begin Next Week',
      'Opposition Demands Special Session on Drought',
      'New Cabinet Expansion Expected Soon',
      'Telangana Budget Session Highlights',
      'MLA Resigns from Party, Joins Opposition',
      'Government Plans for IT Corridor Expansion',
      'Panchayat Elections Date Announced',
    ],
    crime: [
      'Cyber Police Bust Major Online Fraud Ring',
      'Three Arrested in Gold Smuggling Case',
      'Hyderabad Police Launch Night Patrol Initiative',
      'Fraudulent Company Dupes Investors of Crores',
      'Women Safety Initiative Launched in City',
    ],
    sports: [
      'Telangana Athlete Wins Gold at National Championship',
      'Hyderabad FC Match Draws Record Crowd',
      'State Government Announces Sports Academy',
      'Cricket Tournament Finals This Weekend',
      'Local Boxer Qualifies for Olympics',
    ],
    entertainment: [
      'Tollywood Star Announces New Film Project',
      'Hyderabad International Film Festival Dates Out',
      'Popular Singer to Perform in City This Month',
      'Streaming Platform Launches Telugu Originals',
      'Cultural Festival Celebrates Telangana Heritage',
    ],
    business: [
      'IT Exports from Telangana Hit New Record',
      'Pharma City Project Gains Momentum',
      'Start-up Ecosystem in Hyderabad Booming',
      'New Industrial Policy Attracts Major Investments',
      'Real Estate Market Shows Strong Growth',
    ],
    technology: [
      'AI Hub Planned for Hyderabad',
      'Tech Giants Expand Operations in City',
      'Digital Literacy Program Reaches Rural Areas',
      '5G Rollout Accelerates Across State',
    ],
    education: [
      'New Universities to Be Established in Telangana',
      'Student Scholarship Program Expanded',
      'Board Exam Results Announced',
      'Teachers Recruitment Drive Launched',
      'IIT Hyderabad Ranks Among Top Institutions',
    ],
    health: [
      'New Government Hospital Inaugurated',
      'Free Health Check-up Camp for Rural Areas',
      'Aarogyasri Scheme Coverage Expanded',
      'Medical College Approved for District',
      'Dengue Cases Decline After Prevention Drive',
    ],
    agriculture: [
      'Kharif Season: Farmers Report Good Yield',
      'New Irrigation Project Inaugurated',
      'Rythu Bandhu Scheme Disbursement Begins',
      'Organic Farming Initiative Gains Traction',
      'Crop Insurance Claims Processing Speeds Up',
    ],
    infrastructure: [
      'Metro Rail Extension Work Progresses',
      'New Flyover to Ease Traffic Congestion',
      'Smart City Project Phase 2 Begins',
      'Road Development in Rural Telangana',
      'Water Supply Project for Urban Areas',
    ],
  }

  const priorities = ['normal', 'normal', 'normal', 'high', 'breaking']
  const statuses = ['published', 'published', 'published', 'published', 'pending_review', 'draft']
  let newsCount = 0
  for (const category of allCategories) {
    const catSlug = category.slug
    const titles = newsTitles[catSlug] || []
    for (let i = 0; i < titles.length; i++) {
      const title = titles[i]
      const district = allDistricts[Math.floor(Math.random() * allDistricts.length)]
      const reporter = allReporters[Math.floor(Math.random() * allReporters.length)]
      const priority = priorities[Math.floor(Math.random() * priorities.length)]
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const daysAgo = Math.floor(Math.random() * 30)
      const publishedAt = status === 'published' ? new Date(Date.now() - daysAgo * 86400000) : null

      // Assign 1-2 random tags to each news
      const randomTags = allTags.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 2) + 1)

      await prisma.news.create({
        data: {
          title,
          shortDesc: `Short description for: ${title}`,
          content: `Full content for: ${title}. This is a detailed news article covering the latest developments in ${category.name}. Stay tuned for more updates on this developing story.`,
          categoryId: category.id,
          stateId: telangana.id,
          districtId: district.id,
          thumbnailUrl: `https://placehold.co/800x450/DC2626/white?text=${encodeURIComponent(category.name)}`,
          imagesUrls: '[]',
          sourceType: i % 3 === 0 ? 'reporter' : 'original',
          reporterId: i % 3 === 0 ? reporter.id : null,
          priority, status, publishedAt,
          isFeatured: priority === 'breaking',
          viewsCount: Math.floor(Math.random() * 5000),
          sharesCount: Math.floor(Math.random() * 500),
          createdBy: admin.id,
          tags: {
            create: randomTags.map(tag => ({ tagId: tag.id })),
          },
        },
      })
      newsCount++
    }
  }
  console.log(`✅ ${newsCount} news articles created`)

  // 9. Create Sample Videos
  for (let i = 0; i < 8; i++) {
    const cat = allCategories[i % allCategories.length]
    await prisma.video.create({
      data: {
        title: `Video: ${cat.name} Update #${i + 1}`,
        description: `Latest video update on ${cat.name}`,
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: `https://placehold.co/800x450/DC2626/white?text=Video+${i + 1}`,
        duration: Math.floor(Math.random() * 600) + 60,
        categoryId: cat.id,
        status: i < 6 ? 'published' : 'draft',
        viewsCount: Math.floor(Math.random() * 10000),
      },
    })
  }
  console.log('✅ 8 videos created')

  // 10. Create Default Settings
  const defaultSettings = [
    { key: 'admob_enabled', value: 'false', description: 'AdMob enabled' },
    { key: 'admob_banner_id', value: '', description: 'AdMob Banner Ad Unit ID' },
    { key: 'admob_interstitial_id', value: '', description: 'AdMob Interstitial Ad Unit ID' },
    { key: 'admob_native_id', value: '', description: 'AdMob Native Ad Unit ID' },
    { key: 'admob_rewarded_id', value: '', description: 'AdMob Rewarded Ad Unit ID' },
    { key: 'admob_frequency_cap', value: '5', description: 'Ad frequency cap per session' },
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

  // 11. Create Sample Push Notifications
  const notifications = [
    { title: 'Breaking: CM Addresses Press Conference', body: 'Chief Minister addresses media on new policy decisions', targetType: 'all' },
    { title: 'Weather Alert: Heavy Rain Expected', body: 'IMD issues heavy rainfall warning for several districts', targetType: 'all' },
    { title: 'Local Update: Metro Extension', body: 'New metro stations to be operational from next month', targetType: 'district' },
  ]
  for (const n of notifications) {
    await prisma.pushNotification.create({
      data: {
        title: n.title, body: n.body, targetType: n.targetType,
        targetValue: n.targetType === 'district' ? allDistricts[0]?.id : null,
        status: 'sent',
        sentCount: Math.floor(Math.random() * 5000) + 1000,
        deliveredCount: Math.floor(Math.random() * 4000) + 800,
        openedCount: Math.floor(Math.random() * 1000) + 100,
      },
    })
  }
  console.log('✅ 3 push notifications created')

  // 12. Create Sample Custom Ads
  const adsData = [
    { title: 'Telangana Tourism - Visit Hyderabad', advertiser: 'Telangana Tourism Dept', type: 'image', placement: 'home_banner' },
    { title: 'Sankranti Sale - Big Discounts', advertiser: 'Mall of Hyderabad', type: 'image', placement: 'feed_inline', frequency: 5 },
    { title: 'IPL Live Streaming Promo', advertiser: 'Hotstar', type: 'video', placement: 'feed_inline', frequency: 8 },
  ]
  for (const ad of adsData) {
    await prisma.customAd.create({
      data: {
        title: ad.title, advertiser: ad.advertiser, type: ad.type as 'image' | 'video',
        imagesUrls: JSON.stringify(ad.type === 'image' ? [`https://placehold.co/800x400/DC2626/white?text=${encodeURIComponent(ad.advertiser)}`] : []),
        layout: 'grid',
        videoUrl: ad.type === 'video' ? 'https://example.com/ad-video.mp4' : null,
        placement: ad.placement,
        frequency: ad.frequency || 5,
        targetStateIds: JSON.stringify([telangana.id]),
        targetCategoryIds: JSON.stringify([]),
        impressionsLimit: 100000,
        impressionsServed: Math.floor(Math.random() * 50000),
        clicksServed: Math.floor(Math.random() * 3000),
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        isActive: true,
      },
    })
  }
  console.log(`✅ ${adsData.length} custom ads created`)

  // 13. Create sample users
  for (let i = 0; i < 10; i++) {
    const district = allDistricts[i % allDistricts.length]
    await prisma.user.create({
      data: {
        phone: `900000000${i}`,
        name: `User ${i + 1}`,
        stateId: telangana.id,
        districtId: district.id,
        preferredLanguage: i % 2 === 0 ? 'te' : 'en',
        isActive: true,
        isPremium: i < 2,
      },
    })
  }
  console.log('✅ 10 sample users created')

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

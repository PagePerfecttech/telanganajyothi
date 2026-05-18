import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Create Super Admin
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@telanganajyothi.com' },
    update: {},
    create: {
      email: 'admin@telanganajyothi.com',
      passwordHash: 'admin123',
      name: 'Super Admin',
      role: 'super_admin',
      isActive: true,
    },
  })
  console.log('✅ Admin created:', admin.email)

  // 2. Create Telangana State
  const telangana = await prisma.state.upsert({
    where: { code: 'TG' },
    update: {},
    create: {
      name: 'Telangana',
      code: 'TG',
      isActive: true,
    },
  })
  console.log('✅ State created:', telangana.name)

  // 3. Create all 33 Telangana Districts
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
      create: {
        name,
        stateId: telangana.id,
        isActive: true,
      },
    })
  }
  console.log(`✅ ${districtNames.length} districts created`)

  // 4. Create Categories
  const categories = [
    { nameEn: 'Politics', nameTe: 'రాజకీయాలు', slug: 'politics', color: '#DC2626' },
    { nameEn: 'Crime', nameTe: 'నేరం', slug: 'crime', color: '#7C3AED' },
    { nameEn: 'Sports', nameTe: 'క్రీడలు', slug: 'sports', color: '#059669' },
    { nameEn: 'Entertainment', nameTe: 'వినోదం', slug: 'entertainment', color: '#D97706' },
    { nameEn: 'Business', nameTe: 'వ్యాపారం', slug: 'business', color: '#2563EB' },
    { nameEn: 'Technology', nameTe: 'సాంకేతికత', slug: 'technology', color: '#0891B2' },
    { nameEn: 'Education', nameTe: 'విద్య', slug: 'education', color: '#4F46E5' },
    { nameEn: 'Health', nameTe: 'ఆరోగ్యం', slug: 'health', color: '#16A34A' },
    { nameEn: 'Agriculture', nameTe: 'వ్యవసాయం', slug: 'agriculture', color: '#65A30D' },
    { nameEn: 'Infrastructure', nameTe: 'మౌలిక సదుపాయాలు', slug: 'infrastructure', color: '#9333EA' },
  ]

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i]
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        nameEn: cat.nameEn,
        nameTe: cat.nameTe,
        slug: cat.slug,
        color: cat.color,
        sortOrder: i,
        isActive: true,
      },
    })
  }
  console.log(`✅ ${categories.length} categories created`)

  // 5. Create Tags
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
      create: {
        name: tag.name,
        slug: tag.slug,
        type: tag.type,
        isTrending: Math.random() > 0.5,
        isActive: true,
      },
    })
  }
  console.log(`✅ ${tags.length} tags created`)

  // 6. Create Sample Reporters
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
        name: r.name,
        phone: r.phone,
        email: r.email,
        bio: `Experienced reporter covering ${r.beat} beats in Telangana.`,
        stateId: telangana.id,
        districtId: district.id,
        beat: r.beat,
        status: 'active',
        canPublishDirectly: i < 2,
      },
    })
  }
  console.log(`✅ ${reportersData.length} reporters created`)

  // 7. Create Sample News
  const allCategories = await prisma.category.findMany()
  const allReporters = await prisma.reporter.findMany()

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

      await prisma.news.create({
        data: {
          titleEn: title,
          titleTe: title,
          shortDescEn: `Short description for: ${title}`,
          shortDescTe: `${title} కోసం చిన్న వివరణ`,
          contentEn: `Full content for: ${title}. This is a detailed news article covering the latest developments in ${category.nameEn}. Stay tuned for more updates on this developing story.`,
          contentTe: `${title} కోసం పూర్తి విషయం. ${category.nameTe}లో తాజా పరిణామాలపై ఇది వివరంగా ఉన్న వార్తా కథనం.`,
          categoryId: category.id,
          stateId: telangana.id,
          districtId: district.id,
          thumbnailUrl: `https://placehold.co/800x450/DC2626/white?text=${encodeURIComponent(category.nameEn)}`,
          imagesUrls: '[]',
          sourceType: i % 3 === 0 ? 'reporter' : 'original',
          reporterId: i % 3 === 0 ? reporter.id : null,
          priority,
          status,
          publishedAt,
          isFeatured: priority === 'breaking',
          viewsCount: Math.floor(Math.random() * 5000),
          sharesCount: Math.floor(Math.random() * 500),
          createdBy: admin.id,
        },
      })
      newsCount++
    }
  }
  console.log(`✅ ${newsCount} news articles created`)

  // 8. Create Sample Videos
  for (let i = 0; i < 8; i++) {
    const cat = allCategories[i % allCategories.length]
    await prisma.video.create({
      data: {
        title: `Video: ${cat.nameEn} Update #${i + 1}`,
        description: `Latest video update on ${cat.nameEn}`,
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: `https://placehold.co/800x450/DC2626/white?text=Video+${i + 1}`,
        duration: Math.floor(Math.random() * 600) + 60,
        categoryId: cat.id,
        status: 'published',
        viewsCount: Math.floor(Math.random() * 10000),
      },
    })
  }
  console.log('✅ 8 videos created')

  // 9. Create Default Settings
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
      create: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
      },
    })
  }
  console.log(`✅ ${defaultSettings.length} settings created`)

  // 10. Create Sample Push Notifications
  const notifications = [
    { title: 'Breaking: CM Addresses Press Conference', body: 'Chief Minister addresses media on new policy decisions', targetType: 'all' },
    { title: 'Weather Alert: Heavy Rain Expected', body: 'IMD issues heavy rainfall warning for several districts', targetType: 'all' },
    { title: 'Local Update: Metro Extension', body: 'New metro stations to be operational from next month', targetType: 'district' },
  ]

  for (const n of notifications) {
    await prisma.pushNotification.create({
      data: {
        title: n.title,
        body: n.body,
        targetType: n.targetType,
        targetValue: n.targetType === 'district' ? allDistricts[0]?.id : null,
        status: 'sent',
        sentCount: Math.floor(Math.random() * 5000) + 1000,
        deliveredCount: Math.floor(Math.random() * 4000) + 800,
        openedCount: Math.floor(Math.random() * 1000) + 100,
      },
    })
  }
  console.log('✅ 3 push notifications created')

  // 11. Create Sample Custom Ads
  await prisma.customAd.create({
    data: {
      title: 'Telangana Tourism - Visit Hyderabad',
      advertiser: 'Telangana Tourism Dept',
      type: 'image',
      imagesUrls: JSON.stringify(['https://placehold.co/800x400/DC2626/white?text=Visit+Hyderabad']),
      layout: 'grid',
      placement: 'home_banner',
      targetStateIds: JSON.stringify([telangana.id]),
      targetCategoryIds: JSON.stringify([]),
      impressionsLimit: 100000,
      impressionsServed: 45000,
      clicksServed: 2300,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      isActive: true,
    },
  })
  console.log('✅ 1 custom ad created')

  // 12. Create sample users
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

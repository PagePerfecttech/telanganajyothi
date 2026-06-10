import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { safeJsonParse } from '@/lib/json-utils'

const feedQuerySchema = z.object({
  district_id: z.string().cuid().optional(),
  category_id: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const parsed = feedQuerySchema.safeParse({
    district_id: searchParams.get('district_id') ?? undefined,
    category_id: searchParams.get('category_id') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { district_id: districtId, category_id: categoryId, page, limit } = parsed.data

  try {
    let dbUser: any = null;
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      try {
        const decodedToken = await verifyFirebaseToken(authHeader);
        const phone = decodedToken?.phone_number || (decodedToken?.email ? `email_${decodedToken.email}` : decodedToken?.uid);
        if (phone) {
          dbUser = await db.user.findUnique({ where: { phone } });
        }
      } catch (e) {
        console.error('Invalid token in feed:', e);
      }
    }

    const finalDistrictId = districtId || dbUser?.districtId || undefined;
    const preferredCats = safeJsonParse<string[]>(dbUser?.preferredCategories, []);
    
    const where: Record<string, unknown> = {
      status: 'published',
      deletedAt: null,
      publishedAt: { lte: new Date() },
    }
    
    if (finalDistrictId) {
      where.districtId = finalDistrictId;
    }
    
    if (categoryId) {
      where.categoryId = categoryId;
    } else if (preferredCats.length > 0) {
      where.categoryId = { in: preferredCats };
    }

    const [news, total] = await Promise.all([
      db.news.findMany({
        where,
        select: {
          id: true,
          title: true,
          shortDesc: true,
          thumbnailUrl: true,
          imagesUrls: true,
          priority: true,
          publishedAt: true,
          viewsCount: true,
          category: { select: { name: true, slug: true, color: true } },
          district: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.news.count({ where }),
    ])

    // Get feed_inline ads with their frequency setting
    const ads = await db.customAd.findMany({
      where: {
        placement: 'feed_inline',
        isActive: true,
        deletedAt: null,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      take: 3,
    })

    // Use the first ad's frequency, default to 5
    const adFrequency = ads.length > 0 ? (ads[0].frequency || 5) : 5

    const feed = news.map((item, index) => {
      const parsedImages = safeJsonParse<string[]>(item.imagesUrls, []);
      const thumbnail = item.thumbnailUrl || (parsedImages.length > 0 ? parsedImages[0] : '');
      const itemWithImages = { ...item, thumbnailUrl: thumbnail, imagesUrls: parsedImages };

      if ((index + 1) % adFrequency === 0 && ads.length > 0) {
        const ad = ads[index % ads.length]
        return {
          type: 'ad',
          ad: {
            ...ad,
            imagesUrls: safeJsonParse<string[]>(ad.imagesUrls || '[]', []),
            targetStateIds: safeJsonParse<string[]>(ad.targetStateIds || '[]', []),
            targetCategoryIds: safeJsonParse<string[]>(ad.targetCategoryIds || '[]', []),
          },
        }
      }
      return {
        type: 'news',
        news: itemWithImages,
      }
    })

    return NextResponse.json({ feed, total, page, limit })
  } catch (error) {
    console.error('Feed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


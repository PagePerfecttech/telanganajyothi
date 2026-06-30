import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { safeJsonParse } from '@/lib/json-utils'

const feedQuerySchema = z.object({
  mandal_id: z.string().cuid().optional(),
  district_id: z.string().cuid().optional(),
  state_id: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const parsed = feedQuerySchema.safeParse({
    mandal_id: searchParams.get('mandal_id') ?? undefined,
    district_id: searchParams.get('district_id') ?? undefined,
    state_id: searchParams.get('state_id') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { mandal_id: mandalId, district_id: districtId, state_id: stateId, page, limit } = parsed.data

  try {
    // Resolve user from auth token
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

    // Resolve location IDs: query params > user profile > undefined
    const finalMandalId = mandalId || dbUser?.mandalId || undefined;
    const finalDistrictId = districtId || dbUser?.districtId || undefined;
    const finalStateId = stateId || dbUser?.stateId || undefined;

    const baseWhere: Record<string, unknown> = {
      status: 'published',
      deletedAt: null,
      publishedAt: { lte: new Date() },
    }

    const selectFields = {
      id: true,
      title: true,
      shortDesc: true,
      thumbnailUrl: true,
      imagesUrls: true,
      priority: true,
      publishedAt: true,
      viewsCount: true,
      sharesCount: true,
      mandalId: true,
      districtId: true,
      stateId: true,
      category: { select: { name: true, slug: true, color: true } },
      district: { select: { name: true } },
      mandal: { select: { name: true } },
      reporter: { select: { name: true, avatar: true } },
      sourceUrl: true,
      _count: {
        select: {
          comments: { where: { isActive: true } },
          reactions: true,
        }
      }
    };

    const orderBy = { publishedAt: 'desc' as const };
    const offset = (page - 1) * limit;

    // 4-tier priority feed: mandal → district → state → other
    const hasLocationFilters = finalMandalId || finalDistrictId || finalStateId;

    let news: any[] = [];
    let total = 0;

    if (hasLocationFilters) {
      // Build tier conditions
      const tiers: Record<string, unknown>[] = [];

      if (finalMandalId) {
        tiers.push({ ...baseWhere, mandalId: finalMandalId });
      }
      if (finalDistrictId) {
        const districtCondition: Record<string, unknown> = { ...baseWhere, districtId: finalDistrictId };
        if (finalMandalId) {
          districtCondition.NOT = { mandalId: finalMandalId };
        }
        tiers.push(districtCondition);
      }
      if (finalStateId) {
        const stateCondition: Record<string, unknown> = { ...baseWhere, stateId: finalStateId };
        const notConditions: Record<string, unknown>[] = [];
        if (finalDistrictId) notConditions.push({ districtId: finalDistrictId });
        if (finalMandalId) notConditions.push({ mandalId: finalMandalId });
        if (notConditions.length > 0) {
          stateCondition.NOT = notConditions.length === 1 ? notConditions[0] : { AND: notConditions };
        }
        tiers.push(stateCondition);
      }

      // "Other" tier: everything not in above tiers
      const otherNotConditions: Record<string, unknown>[] = [];
      if (finalStateId) otherNotConditions.push({ stateId: finalStateId });
      if (finalDistrictId) otherNotConditions.push({ districtId: finalDistrictId });
      if (finalMandalId) otherNotConditions.push({ mandalId: finalMandalId });
      
      const otherWhere: Record<string, unknown> = { ...baseWhere };
      if (otherNotConditions.length > 0) {
        otherWhere.AND = otherNotConditions.map(c => ({ NOT: c }));
      }
      tiers.push(otherWhere);

      // Count all tiers
      const tierCounts = await Promise.all(tiers.map(w => db.news.count({ where: w })));
      total = tierCounts.reduce((sum, c) => sum + c, 0);

      // Fetch from tiers in priority order
      let remaining = limit;
      let skipped = offset;

      for (let i = 0; i < tiers.length && remaining > 0; i++) {
        const tierCount = tierCounts[i];
        
        if (skipped >= tierCount) {
          skipped -= tierCount;
          continue;
        }

        const take = Math.min(remaining, tierCount - skipped);
        const tierNews = await db.news.findMany({
          where: tiers[i],
          select: selectFields,
          orderBy,
          skip: skipped,
          take,
        });
        
        news.push(...tierNews);
        remaining -= tierNews.length;
        skipped = 0; // After first tier with data, skip is consumed
      }
    } else {
      // No location filters — show all news chronologically
      const [allNews, allTotal] = await Promise.all([
        db.news.findMany({
          where: baseWhere,
          select: selectFields,
          orderBy,
          skip: offset,
          take: limit,
        }),
        db.news.count({ where: baseWhere }),
      ]);
      news = allNews;
      total = allTotal;
    }

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

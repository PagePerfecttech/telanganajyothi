import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { safeJsonParse } from '@/lib/json-utils'
import { rankAndMixArticles } from '@/lib/recommendation-engine'

const feedQuerySchema = z.object({
  village_id: z.string().cuid().optional(),
  mandal_id: z.string().cuid().optional(),
  assembly_id: z.string().cuid().optional(),
  district_id: z.string().cuid().optional(),
  state_id: z.string().cuid().optional(),
  category: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const parsed = feedQuerySchema.safeParse({
    village_id: searchParams.get('village_id') ?? undefined,
    mandal_id: searchParams.get('mandal_id') ?? undefined,
    assembly_id: searchParams.get('assembly_id') ?? undefined,
    district_id: searchParams.get('district_id') ?? undefined,
    state_id: searchParams.get('state_id') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const {
    village_id,
    mandal_id: mandalId,
    assembly_id,
    district_id: districtId,
    state_id: stateId,
    category,
    page,
    limit,
  } = parsed.data

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
    const finalVillageId = village_id || dbUser?.villageId || undefined;
    const finalMandalId = mandalId || dbUser?.mandalId || undefined;
    const finalAssemblyId = assembly_id || dbUser?.assemblyId || undefined;
    const finalDistrictId = districtId || dbUser?.districtId || undefined;
    const finalStateId = stateId || dbUser?.stateId || undefined;

    // Load category weight preferences for user
    const userPrefs: Record<string, number> = {};
    if (dbUser) {
      const prefs = await db.userPreference.findMany({
        where: { userId: dbUser.id },
      });
      for (const pref of prefs) {
        userPrefs[pref.categoryId] = pref.score;
      }
      
      // Initialize any categories chosen during onboarding but not yet customized by interactions
      const selectedCategories = safeJsonParse<string[]>(dbUser.preferredCategories || '[]', []);
      for (const catId of selectedCategories) {
        if (userPrefs[catId] === undefined) {
          userPrefs[catId] = 1.0; // higher initial score for onboarding interests
        }
      }
    }

    const baseWhere: Record<string, unknown> = {
      status: 'published',
      deletedAt: null,
      publishedAt: { lte: new Date() },
    }

    if (category) {
      baseWhere.categoryId = category
    }

    // Filter by location if explicitly requested via query params (e.g. from Location Tab)
    if (mandalId) {
      baseWhere.mandalId = mandalId
    } else if (districtId) {
      baseWhere.districtId = districtId
    } else if (stateId) {
      baseWhere.stateId = stateId
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
      assemblyId: true,
      villageId: true,
      category: { select: { name: true, slug: true, color: true } },
      district: { select: { name: true } },
      mandal: { select: { name: true } },
      reporter: { select: { name: true, avatar: true } },
      tags: { select: { tag: { select: { name: true, slug: true } } } },
      sourceUrl: true,
      _count: {
        select: {
          comments: { where: { isActive: true } },
          reactions: true,
        }
      }
    };

    const offset = (page - 1) * limit;

    // Fetch candidate articles matching filters (larger pool for personalized sorting)
    const candidateLimit = Math.max(150, page * limit + 50);
    const [candidates, total] = await Promise.all([
      db.news.findMany({
        where: baseWhere,
        select: selectFields,
        orderBy: { publishedAt: 'desc' },
        take: candidateLimit,
      }),
      db.news.count({ where: baseWhere }),
    ]);

    const userLocation = {
      stateId: finalStateId,
      districtId: finalDistrictId,
      assemblyId: finalAssemblyId,
      mandalId: finalMandalId,
      villageId: finalVillageId,
    };

    // Rank and mix categories
    const rankedNews = rankAndMixArticles(candidates, userPrefs, userLocation);

    // Paginate from the ranked list
    const paginatedNews = rankedNews.slice(offset, offset + limit);

    // Get feed_inline ads
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

    const adFrequency = ads.length > 0 ? (ads[0].frequency || 5) : 5

    const feed = paginatedNews.map((item, index) => {
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

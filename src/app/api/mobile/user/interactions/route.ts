import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { verifyFirebaseToken } from '@/lib/firebase-admin'

const interactionSchema = z.object({
  newsId: z.string().cuid(),
  type: z.enum(['view', 'like', 'share', 'watch_time']),
  value: z.number().int().min(0).default(0), // duration in seconds for watch_time
})

export async function POST(request: NextRequest) {
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
        console.error('Invalid token in interactions:', e);
      }
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = interactionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body parameters', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { newsId, type, value } = parsed.data

    // 1. Fetch the news item to find its category
    const newsItem = await db.news.findUnique({
      where: { id: newsId },
      select: { categoryId: true },
    })

    if (!newsItem) {
      return NextResponse.json({ error: 'News article not found' }, { status: 404 })
    }

    // 2. Log interaction in UserInteraction table
    await db.userInteraction.create({
      data: {
        userId: dbUser.id,
        newsId,
        type,
        value,
      },
    })

    // 3. Dynamic Preference Score Update Coefficient logic
    let delta = 0;
    if (type === 'view') {
      delta = 0.05;
    } else if (type === 'like') {
      delta = 0.15;
    } else if (type === 'share') {
      delta = 0.25;
    } else if (type === 'watch_time') {
      if (value < 3) {
        // Quick swipe penalty (negative feedback)
        delta = -0.05;
      } else {
        // Positive engagement relative to watch time duration (up to +0.30)
        delta = Math.min(0.30, value * 0.01);
      }
    }

    // Update coefficient score in UserPreference table
    if (delta !== 0) {
      const existingPreference = await db.userPreference.findUnique({
        where: {
          userId_categoryId: {
            userId: dbUser.id,
            categoryId: newsItem.categoryId,
          },
        },
      })

      const currentScore = existingPreference ? existingPreference.score : 0.5;
      // Cap scores between 0.1 (low interest) and 1.0 (high interest)
      const newScore = Math.max(0.1, Math.min(1.0, currentScore + delta));

      await db.userPreference.upsert({
        where: {
          userId_categoryId: {
            userId: dbUser.id,
            categoryId: newsItem.categoryId,
          },
        },
        update: { score: newScore },
        create: {
          userId: dbUser.id,
          categoryId: newsItem.categoryId,
          score: newScore,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Interaction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

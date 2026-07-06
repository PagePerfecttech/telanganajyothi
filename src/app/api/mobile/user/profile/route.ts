import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { safeJsonParse, safeJsonStringify } from '@/lib/json-utils'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(authHeader);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }

    const phone = decodedToken.phone_number;
    if (!phone) {
       return NextResponse.json({ error: 'Token missing phone number' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { phone } });
    const reporter = await db.reporter.findUnique({ where: { phone } });

    return NextResponse.json({
      user: user ? {
        ...user,
        preferredCategories: safeJsonParse<string[]>(user.preferredCategories, [])
      } : null,
      reporterStatus: reporter ? reporter.status : 'none',
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(authHeader);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }

    // Phone number from Firebase Auth
    const phone = decodedToken.phone_number;
    if (!phone) {
       return NextResponse.json({ error: 'Token missing phone number' }, { status: 401 })
    }

    // Find or create user to get internal userId
    let dbUser = await db.user.findUnique({ where: { phone } });
    if (!dbUser) {
      dbUser = await db.user.create({ data: { phone } });
    }

    const data = await request.json()

    const user = await db.user.update({
      where: { id: dbUser.id },
      data: {
        name: data.name || decodedToken.name || undefined,
        email: data.email,
        stateId: data.stateId,
        districtId: data.districtId,
        assemblyId: data.assemblyId,
        mandalId: data.mandalId,
        villageId: data.villageId,
        preferredLanguage: data.preferredLanguage,
        preferredCategories: data.preferredCategories ? safeJsonStringify(data.preferredCategories) : undefined,
        avatar: data.avatar,
      },
    })

    return NextResponse.json({
      ...user,
      preferredCategories: safeJsonParse<string[]>(user.preferredCategories, [])
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

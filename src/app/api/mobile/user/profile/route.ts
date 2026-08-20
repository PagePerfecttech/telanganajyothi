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
        mandalId: data.mandalId !== undefined ? data.mandalId : (data.districtId && data.districtId !== dbUser.districtId ? null : dbUser.mandalId),
        villageId: data.villageId,
        preferredLanguage: data.preferredLanguage,
        preferredCategories: data.preferredCategories ? safeJsonStringify(data.preferredCategories) : undefined,
        avatar: data.avatar,
      },
    })

    // Also update Reporter record if user is a reporter
    const existingReporter = await db.reporter.findUnique({ where: { phone } });
    if (existingReporter) {
      await db.reporter.update({
        where: { id: existingReporter.id },
        data: {
          name: data.name || existingReporter.name,
          email: data.email !== undefined ? data.email : existingReporter.email,
          avatar: data.avatar ? data.avatar : existingReporter.avatar,
          stateId: data.stateId || existingReporter.stateId,
          districtId: data.districtId || existingReporter.districtId,
          mandalId: data.mandalId !== undefined ? data.mandalId : (data.districtId && data.districtId !== existingReporter.districtId ? null : existingReporter.mandalId),
        }
      });
    }

    return NextResponse.json({
      ...user,
      preferredCategories: safeJsonParse<string[]>(user.preferredCategories, [])
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
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

    const data = await request.json()
    const { name, email, bio, stateId, districtId, beat, idProofUrl, avatar } = data;

    // A reporter needs a state, district and ID proof
    if (!stateId || !districtId || !idProofUrl) {
      return NextResponse.json({ error: 'State, District, and ID proof are required' }, { status: 400 })
    }

    // Check if already applied
    let reporter = await db.reporter.findUnique({ where: { phone } })
    if (reporter) {
      return NextResponse.json({ error: 'Already applied' }, { status: 400 })
    }

    reporter = await db.reporter.create({
      data: {
        name: name || phone,
        phone,
        email,
        bio,
        stateId,
        districtId,
        beat,
        idProofUrl,
        avatar,
        status: 'pending',
      }
    })

    return NextResponse.json({ message: 'Application submitted', reporter })
  } catch (error) {
    console.error('Reporter apply error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

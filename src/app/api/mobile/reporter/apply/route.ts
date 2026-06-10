import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { z } from 'zod'

const applyReporterSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  stateId: z.string().cuid('Invalid state ID'),
  districtId: z.string().cuid('Invalid district ID'),
  beat: z.string().max(100).optional().nullable(),
  idProofUrl: z.string().url('Invalid ID proof URL'),
  avatar: z.string().url('Invalid avatar URL').optional().nullable(),
})

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
    
    // Validate input
    const parsed = applyReporterSchema.safeParse(data)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const validatedData = parsed.data

    // Check if already applied
    let reporter = await db.reporter.findUnique({ where: { phone } })
    if (reporter) {
      return NextResponse.json({ error: 'Already applied' }, { status: 400 })
    }

    reporter = await db.reporter.create({
      data: {
        name: validatedData.name || phone,
        phone,
        email: validatedData.email || null,
        bio: validatedData.bio || null,
        stateId: validatedData.stateId,
        districtId: validatedData.districtId,
        beat: validatedData.beat || null,
        idProofUrl: validatedData.idProofUrl,
        avatar: validatedData.avatar || null,
        status: 'pending',
      }
    })

    return NextResponse.json({ message: 'Application submitted', reporter })
  } catch (error) {
    console.error('Reporter apply error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

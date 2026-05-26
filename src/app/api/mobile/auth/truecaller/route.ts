import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { auth } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { payload, signature, signatureAlgorithm } = await request.json()

    if (!payload || !signature) {
      return NextResponse.json({ error: 'Payload and signature required' }, { status: 400 })
    }

    // 1. Fetch public keys from Truecaller
    const tcKeysRes = await fetch('https://api4.truecaller.com/v1/key', { method: 'GET' })
    const tcKeys = await tcKeysRes.json()
    
    // 2. Find matching key
    let isValid = false;
    for (const keyObj of tcKeys) {
       try {
         const verifier = crypto.createVerify('SHA512');
         verifier.update(payload);
         const verified = verifier.verify(keyObj.key, signature, 'base64');
         if (verified) {
            isValid = true;
            break;
         }
       } catch (e) {
          // ignore error with this key, try next
       }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Truecaller Signature' }, { status: 401 })
    }

    // 3. Decode payload
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))
    const phone = decodedPayload.phoneNumber

    if (!phone) {
      return NextResponse.json({ error: 'Phone number not found in Truecaller profile' }, { status: 400 })
    }

    // 4. Find or create user
    let user = await db.user.findUnique({ where: { phone } })
    if (!user) {
      user = await db.user.create({ 
         data: { 
           phone,
           name: `${decodedPayload.firstName || ''} ${decodedPayload.lastName || ''}`.trim() || undefined
         } 
      })
    }

    // 5. Generate Firebase Custom Token
    const customToken = await auth.createCustomToken(user.id, { phone_number: user.phone });

    return NextResponse.json({
      token: customToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        preferredLanguage: user.preferredLanguage,
      },
    })
  } catch (error) {
    console.error('Truecaller verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

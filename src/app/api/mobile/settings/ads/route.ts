import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const revalidate = 60 // Cache for 60 seconds

export async function GET() {
  try {
    // Fetch settings that start with admob_ or custom_ad_
    const settings = await db.setting.findMany({
      where: {
        OR: [
          { key: { startsWith: 'admob_' } },
          { key: { startsWith: 'custom_ad_' } }
        ]
      }
    })

    const adConfig: Record<string, string> = {}
    for (const s of settings) {
      adConfig[s.key] = s.value
    }

    return NextResponse.json(adConfig)
  } catch (error) {
    console.error('Ad Settings API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

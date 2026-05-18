import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const settings = await db.setting.findMany()
    const config: Record<string, string> = {}
    for (const s of settings) {
      config[s.key] = s.value
    }

    return NextResponse.json({
      featureFlags: {
        comments: config.feature_comments !== 'false',
        darkMode: config.feature_dark_mode !== 'false',
        videoSection: config.feature_video_section !== 'false',
        notifications: config.feature_notifications !== 'false',
        bookmarks: config.feature_bookmarks !== 'false',
        share: config.feature_share !== 'false',
      },
      forceUpdate: {
        android: config.force_update_android || '1.0.0',
        ios: config.force_update_ios || '1.0.0',
        hardBlock: config.force_update_hard_block === 'true',
      },
      admob: {
        enabled: config.admob_enabled === 'true',
        bannerId: config.admob_banner_id || '',
        interstitialId: config.admob_interstitial_id || '',
        nativeId: config.admob_native_id || '',
        rewardedId: config.admob_rewarded_id || '',
        frequencyCap: parseInt(config.admob_frequency_cap || '5'),
      },
      maintenance: {
        enabled: config.maintenance_mode === 'true',
        message: config.maintenance_message || '',
      },
    })
  } catch (error) {
    console.error('Config error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

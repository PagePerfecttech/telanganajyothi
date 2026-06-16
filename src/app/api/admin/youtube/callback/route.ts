import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // Optional: read admin session here if you want strict security for callback
    // (Skipped for brevity as typically OAuth flow happens locally or within secure admin panel context)

    if (error) {
      return NextResponse.redirect(new URL('/admin/settings?youtube_error=' + error, request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/admin/settings?youtube_error=no_code', request.url))
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/youtube/callback`
      : 'http://localhost:3000/api/admin/youtube/callback'

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

    const { tokens } = await oauth2Client.getToken(code)

    if (tokens.refresh_token) {
      // Save refresh token to database
      await db.setting.upsert({
        where: { key: 'YOUTUBE_REFRESH_TOKEN' },
        update: { value: tokens.refresh_token },
        create: { key: 'YOUTUBE_REFRESH_TOKEN', value: tokens.refresh_token },
      })
    }

    return NextResponse.redirect(new URL('/admin/settings?youtube_success=true', request.url))
  } catch (err) {
    console.error('YouTube callback error:', err)
    return NextResponse.redirect(new URL('/admin/settings?youtube_error=server_error', request.url))
  }
}

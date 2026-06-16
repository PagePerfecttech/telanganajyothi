import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Use environment variables for the Google OAuth client
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/youtube/callback`
      : 'http://localhost:3000/api/admin/youtube/callback'

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Google OAuth credentials not configured' }, { status: 500 })
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload'
    ]

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Force consent prompt to get a refresh token
      scope: scopes
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('YouTube auth generate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

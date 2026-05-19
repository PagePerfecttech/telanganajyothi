import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js 16 Proxy (formerly middleware)
 * Validates Bearer token on all /api/admin/* routes (except login)
 * Token format: base64(id:email:timestamp)
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't need authentication
  if (
    pathname === '/api' ||
    pathname === '/api/' ||
    pathname.startsWith('/api/mobile/') ||
    pathname === '/api/admin/auth/login'
  ) {
    return NextResponse.next()
  }

  // All other admin API routes require authentication
  if (pathname.startsWith('/api/admin/')) {
    // Check both 'Authorization' and 'authorization' headers
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.substring(7) // Remove 'Bearer '

    // Validate token format: base64(id:email:timestamp)
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      const parts = decoded.split(':')
      if (parts.length < 3) {
        return NextResponse.json({ error: 'Invalid token format' }, { status: 401 })
      }

      // Check token expiry (24 hours)
      const timestamp = parseInt(parts[parts.length - 1], 10)
      if (isNaN(timestamp)) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }

      const tokenAge = Date.now() - timestamp
      const MAX_TOKEN_AGE = 24 * 60 * 60 * 1000 // 24 hours
      if (tokenAge > MAX_TOKEN_AGE) {
        return NextResponse.json({ error: 'Token expired. Please login again.' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}

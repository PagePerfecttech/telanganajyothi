import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

/**
 * Next.js 16 Proxy (formerly middleware)
 * Validates Bearer token on all /api/admin/* routes (except login)
 */
export async function proxy(request: NextRequest) {
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

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_for_dev')
      await jwtVerify(token, secret)
    } catch {
      return NextResponse.json({ error: 'Token expired or invalid. Please login again.' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}

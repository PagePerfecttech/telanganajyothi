import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't need authentication
  if (
    pathname === '/api' ||
    pathname === '/api/' ||
    pathname.startsWith('/api/mobile/') ||
    pathname === '/api/admin/auth/login' ||
    pathname.startsWith('/api/admin/auth/login/')
  ) {
    return NextResponse.next()
  }

  // All other admin API routes require authentication
  if (pathname.startsWith('/api/admin/')) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
      const token = authHeader.replace('Bearer ', '')
      const decoded = Buffer.from(token, 'base64').toString()
      const [id, email, timestamp] = decoded.split(':')
      if (!id || !email || !timestamp) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
      // Check token age (24 hours max)
      const tokenAge = Date.now() - parseInt(timestamp)
      if (tokenAge > 24 * 60 * 60 * 1000) {
        return NextResponse.json({ error: 'Token expired' }, { status: 401 })
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

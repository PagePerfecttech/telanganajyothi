import { NextRequest, NextResponse } from 'next/server'

// Routes that don't require authentication
const publicRoutes = [
  '/api/admin/auth/login',
  '/api/mobile/',
  '/api/',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/') || pathname === '/api')) {
    // Still check for admin routes that aren't login
    if (pathname.startsWith('/api/admin/') && !pathname.startsWith('/api/admin/auth/login')) {
      // Require auth for admin API routes
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

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}

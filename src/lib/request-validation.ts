import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware to enforce request size limits and prevent DoS attacks
 */

// Maximum request body sizes (in bytes)
const LIMITS = {
  default: 1024 * 1024, // 1 MB
  upload: 50 * 1024 * 1024, // 50 MB for file uploads
  feed: 100 * 1024, // 100 KB for feed queries
}

export async function validateRequestSize(request: NextRequest): Promise<NextResponse | null> {
  // Only check POST, PUT, PATCH requests
  if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
    return null
  }

  const contentLength = request.headers.get('content-length')
  if (!contentLength) {
    return null
  }

  const size = parseInt(contentLength, 10)
  const pathname = request.nextUrl.pathname

  let limit = LIMITS.default
  if (pathname.includes('/upload')) {
    limit = LIMITS.upload
  } else if (pathname.includes('/feed')) {
    limit = LIMITS.feed
  }

  if (size > limit) {
    return NextResponse.json(
      { error: `Request body too large. Maximum: ${limit} bytes` },
      { status: 413 }
    )
  }

  return null
}

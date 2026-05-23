import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jwtVerify } from 'jose'

/**
 * Verify admin authentication from request headers
 * Returns the admin user if valid, or null if not authenticated
 */
export async function verifyAuth(request: NextRequest): Promise<{
  id: string
  email: string
  name: string
  role: string
} | null> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('auth.ts: missing or invalid authorization header:', authHeader);
      return null
    }

    const token = authHeader.substring(7)
    if (!token) {
      console.log('auth.ts: missing token after Bearer');
      return null
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_for_dev')
    let payload;
    try {
      const result = await jwtVerify(token, secret)
      payload = result.payload;
    } catch (err) {
      console.log('auth.ts: jwtVerify failed', err);
      return null;
    }

    if (!payload || !payload.adminId || !payload.email) {
      console.log('auth.ts: invalid payload', payload);
      return null
    }

    const adminId = payload.adminId as string
    const email = payload.email as string

    // Verify admin exists and is active
    const admin = await db.admin.findFirst({
      where: {
        id: adminId,
        email,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    if (!admin) {
      console.log('auth.ts: admin not found in DB for', adminId, email);
    }

    return admin
  } catch (err) {
    console.log('auth.ts: unexpected error in verifyAuth', err);
    return null
  }
}

/**
 * Middleware wrapper for admin API routes
 * Verifies authentication and returns 401 if not authenticated
 * Passes the admin user to the handler via context
 */
export function withAuth(
  handler: (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    admin: { id: string; email: string; name: string; role: string }
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const admin = await verifyAuth(request)

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }

    return handler(request, context, admin)
  }
}

/**
 * Check if admin has required role
 */
export function requireRole(...roles: string[]) {
  return (
    request: NextRequest,
    admin: { role: string }
  ): boolean => {
    return roles.includes(admin.role)
  }
}

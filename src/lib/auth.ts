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
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    if (!token) return null

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_for_dev')
    const { payload } = await jwtVerify(token, secret)

    if (!payload || !payload.adminId || !payload.email) return null

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

    return admin
  } catch {
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

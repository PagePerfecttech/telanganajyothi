import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const admin = await db.admin.findUnique({
      where: { email, isActive: true },
    })

    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Support both hashed passwords (new) and plaintext (legacy migration)
    let passwordMatch = false
    if (admin.passwordHash.startsWith('$2a$') || admin.passwordHash.startsWith('$2b$')) {
      // Hashed password
      passwordMatch = await bcrypt.compare(password, admin.passwordHash)
    } else {
      // Legacy plaintext password (auto-migrate on next login)
      passwordMatch = admin.passwordHash === password
      if (passwordMatch) {
        // Auto-migrate to hashed password
        const hashedPassword = await bcrypt.hash(password, 10)
        await db.admin.update({
          where: { id: admin.id },
          data: { passwordHash: hashedPassword },
        })
      }
    }

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_for_dev')
    const token = await new SignJWT({ adminId: admin.id, email: admin.email, role: admin.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    return NextResponse.json({
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        avatar: admin.avatar,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

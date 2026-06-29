import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(authHeader);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }
    
    const phone = decodedToken.phone_number || (decodedToken.email ? `email_${decodedToken.email}` : decodedToken.uid);
    
    let user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      user = await db.user.create({
        data: {
          phone,
          email: decodedToken.email,
          name: decodedToken.name || null,
          avatar: decodedToken.picture || null,
        }
      });
    }
    // Check if user is an admin
    const email = decodedToken.email || null;
    let isAdmin = false;
    if (email) {
      const admin = await db.admin.findUnique({ where: { email } });
      if (admin && admin.isActive && !admin.deletedAt) {
        isAdmin = true;
      }
    }

    // Check if user is a reporter
    const reporter = await db.reporter.findUnique({ where: { phone } });
    const isReporter = reporter && reporter.status === 'active' && !reporter.deletedAt;

    let role = 'user';
    if (isAdmin) role = 'admin';
    else if (isReporter) role = 'reporter';

    return NextResponse.json({ success: true, user: { ...user, role } });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

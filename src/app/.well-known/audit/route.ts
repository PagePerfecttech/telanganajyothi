import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auditFilePath = path.join(process.cwd(), 'public', '.well-known', 'audit')
    if (fs.existsSync(auditFilePath)) {
      const content = fs.readFileSync(auditFilePath, 'utf-8')
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }
  } catch (e) {
    console.error('Error reading audit file:', e)
  }

  return NextResponse.json({ error: 'Audit file not found' }, { status: 404 })
}

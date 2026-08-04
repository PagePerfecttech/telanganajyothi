import { db } from './db'

/**
 * Generates a unique 5-character alphanumeric News ID (e.g. 'A9x2K', 'k3M7P').
 */
export async function generate5CharNewsId(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  let exists = true
  let attempts = 0

  while (exists && attempts < 15) {
    id = ''
    for (let i = 0; i < 5; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    const existing = await db.news.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!existing) {
      exists = false
    }
    attempts++
  }
  return id
}

import { db } from '@/lib/db'

export interface DecodedAuthToken {
  phone_number?: string
  email?: string
  uid?: string
}

/**
 * Normalizes phone numbers into all common variants (+91, 91, 10-digit)
 */
export function getPhoneVariants(phone?: string | null): string[] {
  if (!phone) return []
  const raw = phone.trim()
  const variants = new Set<string>([raw])
  
  const digitsOnly = raw.replace(/\D/g, '')
  if (digitsOnly.length === 10) {
    variants.add(digitsOnly)
    variants.add(`+91${digitsOnly}`)
    variants.add(`91${digitsOnly}`)
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    const tenDigits = digitsOnly.substring(2)
    variants.add(tenDigits)
    variants.add(`+91${tenDigits}`)
    variants.add(digitsOnly)
  }
  
  return Array.from(variants)
}

/**
 * Searches for an active, non-deleted reporter matching phone variants or email.
 */
export async function findReporterFromToken(
  decodedToken: DecodedAuthToken,
  options?: { include?: any }
) {
  const phoneVariants = getPhoneVariants(decodedToken.phone_number)
  const email = decodedToken.email?.trim()

  const conditions: any[] = []

  if (phoneVariants.length > 0) {
    conditions.push({ phone: { in: phoneVariants } })
  }

  if (email) {
    conditions.push({ email: { equals: email, mode: 'insensitive' } })
  }

  if (conditions.length === 0) return null

  return db.reporter.findFirst({
    where: {
      OR: conditions,
      deletedAt: null,
    },
    include: options?.include,
  })
}

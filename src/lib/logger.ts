/**
 * Production-safe logging utility
 * Only logs to console in development, uses structured logging for production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

export const logger = {
  debug: (message: string, data?: unknown): void => {
    if (isDevelopment()) {
      console.log(`[DEBUG] ${message}`, data)
    }
  },

  info: (message: string, data?: unknown): void => {
    if (isDevelopment()) {
      console.log(`[INFO] ${message}`, data)
    }
  },

  warn: (message: string, data?: unknown): void => {
    // Always log warnings
    console.warn(`[WARN] ${message}`, data)
  },

  error: (message: string, error?: Error | unknown): void => {
    // Always log errors, but don't expose stack traces in production
    if (isDevelopment() && error instanceof Error) {
      console.error(`[ERROR] ${message}:`, error)
    } else if (isDevelopment()) {
      console.error(`[ERROR] ${message}:`, error)
    } else {
      // Production: only log message, not details
      console.error(`[ERROR] ${message}`)
    }
  },

  audit: (action: string, details: Record<string, unknown>): void => {
    // Always log audit events (security-critical)
    if (isDevelopment()) {
      console.log(`[AUDIT] ${action}:`, details)
    } else {
      // In production, use proper structured logging
      console.log(JSON.stringify({ level: 'AUDIT', action, details, timestamp: new Date().toISOString() }))
    }
  },
}

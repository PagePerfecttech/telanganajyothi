import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get auth headers for API requests
 * Reads the admin_token from localStorage and returns Authorization header
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('admin_token')
  if (!token) return {}
  return { 'Authorization': `Bearer ${token}` }
}

/**
 * Handle 401 responses - clear auth and redirect to login
 */
function handleUnauthorized(response: Response): Response {
  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('admin_token')
    window.dispatchEvent(new CustomEvent('auth:unauthorized'))
  }
  return response
}

/**
 * Safely parse JSON from a response, handling non-JSON responses gracefully
 */
async function safeJsonParse<T = unknown>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    // Server returned HTML or other non-JSON content
    const text = await response.text()
    console.error('Server returned non-JSON response:', text.substring(0, 200))
    throw new Error(response.status === 401 ? 'Unauthorized' : `Server error (${response.status})`)
  }
  return response.json()
}

/**
 * Authenticated fetch wrapper - adds Authorization header to all requests
 * Auto-redirects to login on 401 responses
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  }
  const response = await fetch(url, { ...options, headers })
  return handleUnauthorized(response)
}

/**
 * Authenticated JSON fetch - for API calls with JSON body
 * Auto-redirects to login on 401 responses
 */
export async function authFetchJSON(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  const response = await fetch(url, { ...options, headers })
  return handleUnauthorized(response)
}

/**
 * Safe API fetch - wraps authFetch and handles JSON parsing safely
 * Checks content-type before parsing and throws descriptive errors
 */
export async function apiFetch<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await authFetch(url, options)
  const data = await safeJsonParse<T>(res)
  if (!res.ok) {
    throw new Error((data as Record<string, unknown>)?.error as string || `Request failed with status ${res.status}`)
  }
  return data
}

/**
 * Safe auth fetch that returns parsed JSON or throws on error
 * Use this for simple GET requests that should return JSON data
 */
export async function authFetchJson<T = unknown>(url: string): Promise<T> {
  const res = await authFetch(url)
  if (!res.ok) {
    const data = await safeJsonParse<{ error?: string }>(res).catch(() => ({ error: `Request failed (${res.status})` }))
    throw new Error(data.error || `Request failed with status ${res.status}`)
  }
  return safeJsonParse<T>(res)
}

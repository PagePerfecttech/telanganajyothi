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
    // Use Zustand store to logout
    // We can't import store here due to circular deps, so we use a custom event
    window.dispatchEvent(new CustomEvent('auth:unauthorized'))
  }
  return response
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

/**
 * Safely parse JSON strings with error handling
 * @param json - JSON string to parse
 * @param defaultValue - Value to return if parsing fails
 * @returns Parsed value or default value if parsing fails
 */
export function safeJsonParse<T>(json: string | null | undefined, defaultValue: T): T {
  if (!json) {
    return defaultValue
  }

  try {
    return JSON.parse(json)
  } catch (error) {
    console.warn('Failed to parse JSON:', error instanceof Error ? error.message : String(error))
    return defaultValue
  }
}

/**
 * Safely stringify JSON with error handling
 * @param value - Value to stringify
 * @returns JSON string or empty array string if stringification fails
 */
export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch (error) {
    console.warn('Failed to stringify JSON:', error instanceof Error ? error.message : String(error))
    return '[]'
  }
}

// Snake_case zu camelCase Konvertierung fuer API-Responses

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

export function mapKeys(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(mapKeys)
  if (typeof obj !== 'object') return obj
  if (obj instanceof Date) return obj

  const mapped: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key)
    mapped[camelKey] = mapKeys(value)
  }
  return mapped
}

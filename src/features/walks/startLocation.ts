export type StartLocation = { latitude: number; longitude: number; label: string; accuracy?: number }
export function validLocation(latitude: unknown, longitude: unknown): boolean {
 return typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90 && typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180
}
/** Search only on explicit submission; never send device coordinates to the geocoder. */
export async function searchStartLocations(query: string, signal: AbortSignal): Promise<StartLocation[]> {
 const url = new URL('https://photon.komoot.io/api/')
 url.searchParams.set('q', query.trim()); url.searchParams.set('limit', '5')
 const response = await fetch(url, { signal, referrerPolicy: 'no-referrer' })
 if (!response.ok) throw new Error('Place search is unavailable. Try again or choose a point on the map.')
 const data = await response.json()
 if (!Array.isArray(data.features)) throw new Error('Place search returned an invalid response.')
 return data.features.flatMap((feature: { geometry?: { coordinates?: number[] }; properties?: Record<string, string> }) => {
  const [longitude, latitude] = feature.geometry?.coordinates ?? []
  if (!validLocation(latitude, longitude)) return []
  const p = feature.properties ?? {}
  return [{ latitude, longitude, label: [...new Set([p.name, p.street, p.city, p.state, p.country].filter(Boolean))].join(', ') || `${latitude}, ${longitude}` }]
 })
}

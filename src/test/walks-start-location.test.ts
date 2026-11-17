import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchStartLocations, validLocation } from '../features/walks/startLocation'
afterEach(() => vi.unstubAllGlobals())
describe('walk start location search (isolated)', () => {
 it('accepts worldwide coordinates and rejects invalid or nonnumeric positions', () => {
  expect(validLocation(-33.86, 151.21)).toBe(true)
  expect(validLocation(90, -180)).toBe(true)
  for (const [lat, lon] of [[91, 0], [0, 181], [NaN, 0], [0, Infinity], ['38', 9], [undefined, 0]]) expect(validLocation(lat, lon)).toBe(false)
 })
 it('sends only explicit search text, encodes it, and filters malformed results', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [
   { geometry: { coordinates: [139.7, 35.7] }, properties: { name: 'Park', city: 'Tokyo', country: 'Japan' } },
   { geometry: { coordinates: [0, 200] } }, { properties: {} },
  ] }) })
  vi.stubGlobal('fetch', fetcher)
  const signal = new AbortController().signal
  expect(await searchStartLocations(' Tokyo & park ', signal)).toEqual([{ latitude: 35.7, longitude: 139.7, label: 'Park, Tokyo, Japan' }])
  const [url, options] = fetcher.mock.calls[0]
  expect(url.searchParams.get('q')).toBe('Tokyo & park')
  expect([...url.searchParams.keys()]).toEqual(['q', 'limit'])
  expect(options).toEqual({ signal, referrerPolicy: 'no-referrer' })
 })
 it('handles no results, unavailable service and malformed responses', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) }).mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, json: async () => ({}) })
  vi.stubGlobal('fetch', fetcher)
  const signal = new AbortController().signal
  expect(await searchStartLocations('unknown', signal)).toEqual([])
  await expect(searchStartLocations('unknown', signal)).rejects.toThrow('unavailable')
  await expect(searchStartLocations('unknown', signal)).rejects.toThrow('invalid response')
 })
})

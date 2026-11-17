import { describe, expect, it } from 'vitest'
import { locationTimestamp } from '../features/walks/locationTimestamp'
const now = Date.parse('2026-11-16T15:57:10Z')
const offset = 978307200000
// Reproduces the age (978307200 seconds) in the supplied Safari screenshot.
describe('browser geolocation timestamps', () => {
 it('preserves standard Unix millisecond fixes', () => {
  expect(locationTimestamp(now - 1000, now)).toBe(now - 1000)
 })
 it('corrects the exact Apple epoch offset for a fresh position', () => {
  expect(locationTimestamp(now - offset, now)).toBe(now)
  expect(locationTimestamp(now - offset - 1200, now)).toBe(now - 1200)
 })
 it('does not turn old, future or malformed fixes into current positions', () => {
  for (const stamp of [now - 61000, now - offset - 61000, now + 6000, now - offset + 6000, NaN, Infinity, 0, now / 1000]) expect(locationTimestamp(stamp, now)).toBeNull()
 })
})

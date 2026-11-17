import { afterEach, describe, expect, it, vi } from 'vitest'
import { watchDeviceLocation, type DeviceLocationState } from '../features/walks/deviceLocation'
afterEach(() => { vi.useRealTimers() })
function setup() {
 let gps!: PositionCallback, fail!: PositionErrorCallback
 const geo = { getCurrentPosition: vi.fn(), watchPosition: vi.fn((success: PositionCallback, error: PositionErrorCallback) => { gps = success; fail = error; return 7 }), clearWatch: vi.fn() } as unknown as Geolocation
 const states: DeviceLocationState[] = []
 const stop = watchDeviceLocation(geo, state => states.push(state))
 return { geo, states, stop, coarse: (accuracy = 800, timestamp = Date.now()) => gps(fix(accuracy, timestamp)), gps: (accuracy = 10, timestamp = Date.now()) => gps(fix(accuracy, timestamp)), fail: (code: number) => fail({ code } as GeolocationPositionError) }
}
function fix(accuracy: number, timestamp: number): GeolocationPosition { return { coords: { latitude: 38.72, longitude: -9.14, accuracy }, timestamp } as GeolocationPosition }
describe('device location acquisition (simulated, no real GPS)', () => {
 it('uses a single live device watch and accepts more accurate updates', () => {
  const s = setup(); s.coarse(); expect(s.states.at(-1)?.location?.accuracy).toBe(800)
  s.gps(); expect(s.states.at(-1)?.location?.accuracy).toBe(10)
  s.coarse(); expect(s.states.at(-1)?.location?.accuracy).toBe(10)
  expect(s.geo.getCurrentPosition).not.toHaveBeenCalled()
  expect(s.geo.watchPosition).toHaveBeenCalledExactlyOnceWith(expect.any(Function), expect.any(Function), { enableHighAccuracy: false, maximumAge: 0, timeout: 30000 })
  s.stop(); expect(s.geo.clearWatch).toHaveBeenCalledWith(7)
 })
 it('retains a valid fix on transient errors but clears it on permission denial', () => {
  const s = setup(); s.gps(); s.fail(3)
  expect(s.states.at(-1)?.location?.accuracy).toBe(10)
  s.fail(1); expect(s.states.at(-1)?.location).toBeNull()
  expect(s.states.at(-1)?.error).toContain('blocked')
  s.coarse(); expect(s.states.at(-1)?.location).toBeNull(); s.stop()
 })
 it('exits indefinite loading and ignores stale positions and callbacks after cleanup', () => {
  vi.useFakeTimers(); const s = setup(); s.coarse(100, Date.now() - 120000)
  expect(s.states.at(-1)?.browserError).toContain('outdated timestamp')
  vi.advanceTimersByTime(35000)
  expect(s.states.at(-1)?.locating).toBe(false)
  expect(s.states.at(-1)?.error).toContain('device has not returned')
  s.stop(); const count = s.states.length; s.gps(); s.fail(2)
  expect(s.states).toHaveLength(count)
 })
 it('displays the real fix when Safari uses the Apple reference epoch', () => {
  const s = setup(); s.gps(10, Date.now() - 978307200000)
  expect(s.states.at(-1)?.location).toMatchObject({ latitude: 38.72, longitude: -9.14, accuracy: 10 })
  expect(s.states.at(-1)?.error).toBe(''); expect(s.states.at(-1)?.locating).toBe(false); s.stop()
 })
 it('accepts a later successful fix after a timeout', () => {
  const s = setup(); s.fail(3); expect(s.states.at(-1)?.error).toContain('timed out'); expect(s.states.at(-1)?.browserError).toContain('Code 3')
  s.coarse(); expect(s.states.at(-1)?.error).toBe(''); expect(s.states.at(-1)?.location).not.toBeNull(); s.stop()
 })
})

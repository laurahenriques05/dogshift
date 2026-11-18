import { locationTimestamp } from './locationTimestamp'
import { validLocation, type StartLocation } from './startLocation'

export type DeviceLocationState = { location: StartLocation | null; locating: boolean; error: string; browserError?: string }
/** Use one device-location subscription for the preview; recording requests GPS separately. */
export function watchDeviceLocation(geo: Geolocation, update: (state: DeviceLocationState) => void): () => void {
 let disposed = false, denied = false, location: StartLocation | null = null
 let lastTimestamp = 0
 let browserError: string | undefined
 const publish = (error = '', locating = false) => { if (!disposed) update({ location, locating, error, browserError }) }
 publish('', true)
 const timer = setTimeout(() => { if (!browserError) browserError = 'No position or error callback received from the browser.'; publish(location ? 'Location updates are taking longer than expected. The last detected position is shown.' : 'Your device has not returned a location. Check location access for this browser and your device, then retry. In an in-app browser, try opening PawShare in Safari or Chrome.') }, 35000)
 const success = (position: GeolocationPosition) => {
  if (disposed || denied) return
  const { latitude, longitude, accuracy } = position.coords
  const receivedAt = Date.now()
  const timestamp = locationTimestamp(position.timestamp, receivedAt)
  const age = receivedAt - position.timestamp
  if (!validLocation(latitude, longitude) || !Number.isFinite(accuracy) || accuracy < 0 || timestamp === null) {
   browserError = !validLocation(latitude, longitude) ? 'The browser returned invalid coordinates.' : !Number.isFinite(accuracy) || accuracy < 0 ? 'The browser returned invalid accuracy.' : `The browser returned an invalid or outdated timestamp (age: ${Math.round(age / 1000)} s).`
   if (!location) publish('A location was received but could not be used. Waiting for a fresh device position.')
   return
  }
  // A delayed coarse response must not replace the more accurate, recent GPS fix.
  if (location && timestamp <= lastTimestamp && accuracy >= location.accuracy!) return
  if (location && accuracy > location.accuracy! && timestamp - lastTimestamp < 10000) return
  location = { latitude, longitude, accuracy, label: 'Your current location' }; lastTimestamp = timestamp
  browserError = undefined; clearTimeout(timer); publish()
 }
 const failure = (error: GeolocationPositionError) => {
  if (disposed || denied) return
  browserError = `Code ${error.code}: ${error.message || 'No additional browser details'}`
  if (error.code === 1) {
   denied = true; location = null; clearTimeout(timer)
   publish('Location access is blocked. Allow location for PawShare in the browser, and enable Location Services for that browser in your device settings. Then retry.')
  } else if (!location) {
   // The watch can recover after a transient failure without creating another request.
   publish(error.code === 2 ? 'Your device cannot determine its location yet. Check Location Services and your connection. Still trying; you can retry.' : 'A location request timed out. Still waiting for a device fix; you can retry.')
  }
 }
 let watch: number | undefined
 try {
  watch = geo.watchPosition(success, failure, { enableHighAccuracy: false, maximumAge: 0, timeout: 30000 })
 } catch {
  clearTimeout(timer); publish('Location could not be requested in this browser. Try opening PawShare in Safari or Chrome.')
 }
 return () => { disposed = true; clearTimeout(timer); if (watch !== undefined) geo.clearWatch(watch) }
}

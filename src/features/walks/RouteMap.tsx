import { lazy, Suspense, useState } from 'react'
import type { Point } from './gps'
import { useDogPlaces } from './useDogPlaces'
import { Button } from '../../components/ui'
import { googleMapsConfigured } from './googleMaps'
const VectorRouteMap = lazy(() => import('./VectorRouteMap'))
const GoogleRouteMap = lazy(() => import('./GoogleRouteMap'))

/** One provider choice for history previews, completed walks and live recording. */
export function RouteMap(props: { points: Point[]; compact?: boolean; live?: boolean }) {
 const [nearby,setNearby]=useState(false)
 const point=props.points.at(-1)
 const results=useDogPlaces(point,nearby)
 const Map=googleMapsConfigured()?GoogleRouteMap:VectorRouteMap
 return <div className="walk-map-with-places"><Suspense fallback={<p role="status">Loading map…</p>}><Map {...props} places={results.places}/></Suspense>
  <div className="walk-nearby"><label className="walk-check"><input type="checkbox" checked={nearby} onChange={event=>setNearby(event.target.checked)}/>Search nearby dog places</label>
  {!nearby&&<p className="muted">Mapped dog places appear as you zoom in. Search for more vets, veterinary hospitals, dog parks and pet services nearby. Enabling this shares the approximate map area with the Overpass service operated by Private.coffee and refreshes as you move. <a href="https://overpass.private.coffee/#privacy-policy" target="_blank" rel="noreferrer">Service privacy</a></p>}
  {nearby&&<><p className="muted">Near the last recorded GPS position · © OpenStreetMap contributors. Coverage varies; opening hours and emergency services are not verified.</p>
   {!point?<p role="status">Waiting for a recorded GPS position.</p>:results.loading?<p role="status">Finding nearby dog places…</p>:results.error?<p role="alert">{results.error} <Button className="secondary" onClick={results.retry}>Retry nearby places</Button></p>:!results.places.length?<p role="status">No mapped dog places found within 1.2 km.</p>:null}
   <ul className="walk-nearby-list">{results.places.slice(0,5).map(place=><li key={place.id}><a href={`https://www.openstreetmap.org/${place.id}`} target="_blank" rel="noreferrer">{place.name}</a><span>{place.kind} · {Math.round(place.meters)} m</span></li>)}</ul>
  </>}
  </div></div>
}

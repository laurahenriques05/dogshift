import { lazy, Suspense, useState } from 'react'
import type { Point } from './gps'
import { useDogPlaces } from './useDogPlaces'
import { MapPreferences } from './MapPreferences'
import type { MapViewMode } from './mapPresentation'
import { googleMapsConfigured } from './googleMaps'
const VectorRouteMap = lazy(() => import('./VectorRouteMap'))
const GoogleRouteMap = lazy(() => import('./GoogleRouteMap'))

/** One provider choice for history previews, completed walks and live recording. */
export function RouteMap(props: { points: Point[]; compact?: boolean; live?: boolean }) {
 const [nearby,setNearby]=useState(false),[mode,setMode]=useState<MapViewMode>('standard'),[viewError,setViewError]=useState('')
 const point=props.points.at(-1)
 const results=useDogPlaces(point,!!props.live&&nearby)
 const Map=googleMapsConfigured()&&mode!=='3d'&&!nearby?GoogleRouteMap:VectorRouteMap
 const onModeError=()=>{setMode('standard');setViewError('Imagery unavailable. Standard map is shown.')}
 return <div className="walk-map-with-places"><Suspense fallback={<p role="status">Loading map…</p>}><Map {...props} places={props.live&&nearby?results.places:[]} mode={mode} showDogPlaces={!!props.live&&nearby} onModeError={onModeError}/></Suspense>
  <MapPreferences showDogs={!!props.live} mode={mode} onMode={value=>{setViewError('');setMode(value)}} dogs={nearby} onDogs={setNearby} error={viewError}/>
 </div>
}

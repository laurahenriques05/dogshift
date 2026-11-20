import type { MapViewMode } from './mapPresentation'
import { SATELLITE_CREDITS } from './mapPresentation'
/** Visible immediately below each non-Google map, including fullscreen dialogs. */
export function MapCredits({mode='standard',raster=false}:{mode?:MapViewMode;raster?:boolean}){
 return <div className="walk-map-credits">{mode==='satellite'?<>{SATELLITE_CREDITS} · </>:!raster&&<><a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">© OpenMapTiles</a> · </>}<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a></div>
}

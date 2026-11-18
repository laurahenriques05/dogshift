import { Layers } from 'lucide-react'
import { WalkFilterSelect } from './WalkFilterSelect'
import type { MapViewMode } from './mapPresentation'
export function MapPreferences({mode,onMode,dogs,onDogs,error}:{mode:MapViewMode;onMode:(value:MapViewMode)=>void;dogs:boolean;onDogs:(value:boolean)=>void;error?:string}){
 return <div className="walk-map-preferences"><label className="walk-dog-toggle"><input type="checkbox" checked={dogs} onChange={event=>onDogs(event.target.checked)}/><span>Search nearby dog places</span></label><div className="walk-map-view"><Layers size={17} aria-hidden="true"/><WalkFilterSelect label="Map view" value={mode} onChange={value=>onMode(value as MapViewMode)} options={[{value:'standard',label:'Standard'},{value:'3d',label:'3D'},{value:'satellite',label:'Satellite'}]}/></div>{error&&<span className="walk-map-preference-error" role="status">{error}</span>}</div>
}

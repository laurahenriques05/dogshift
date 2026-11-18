import { dogPlaceFilter } from './mapPresentation'
import type { Map as VectorMap } from 'maplibre-gl'
/** Reuse the already-loaded map POIs; no additional location/search request. */
export function addDogPlaceTileLayers(map: VectorMap) {
 if(!map.getSource('openmaptiles')||map.getLayer('walk-dog-tile-dot'))return
 const filter=dogPlaceFilter
 map.addLayer({id:'walk-dog-tile-dot',type:'circle',source:'openmaptiles','source-layer':'poi',minzoom:13,filter,layout:{visibility:'none'},paint:{'circle-radius':5,'circle-color':'#244d3c','circle-stroke-color':'#fffdf7','circle-stroke-width':2}})
 map.addLayer({id:'walk-dog-tile-label',type:'symbol',source:'openmaptiles','source-layer':'poi',minzoom:13,filter,layout:{visibility:'none','text-field':['coalesce',['get','name:en'],['get','name_en'],['get','name'],'Dog place'],'text-font':['Noto Sans Regular'],'text-size':12,'text-offset':[0,1.3],'text-anchor':'top','text-max-width':12},paint:{'text-color':'#244d3c','text-halo-color':'#fffdf7','text-halo-width':2}})
}

import { distance } from './gps'
import { dogPlaceFilter } from './mapPresentation'
import type { Map as VectorMap } from 'maplibre-gl'
/** Reuse the already-loaded map POIs; no additional location/search request. */
export function addDogPlaceTileLayers(map: VectorMap) {
 if(!map.getSource('openmaptiles')||map.getLayer('walk-dog-tile-dot'))return
 const filter=dogPlaceFilter
 map.addLayer({id:'walk-dog-tile-dot',type:'circle',source:'openmaptiles','source-layer':'poi',minzoom:16,filter,layout:{visibility:'none'},paint:{'circle-radius':5,'circle-color':'#244d3c','circle-stroke-color':'#fffdf7','circle-stroke-width':2}})
 map.addLayer({id:'walk-dog-tile-label',type:'symbol',source:'openmaptiles','source-layer':'poi',minzoom:16,filter,layout:{visibility:'none','text-field':['coalesce',['get','name:en'],['get','name_en'],['get','name'],'Dog place'],'text-font':['Noto Sans Regular'],'text-size':12,'text-allow-overlap':true,'text-ignore-placement':true,'text-offset':[0,1.3],'text-anchor':'top','text-max-width':12},paint:{'text-color':'#244d3c','text-halo-color':'#fffdf7','text-halo-width':2}})
}

/** Keep already observed POIs when less detailed tiles omit them on zoom-out.
 * Session memory only; no additional provider request or account/location upload. */
export function retainDogPlacesOnZoomOut(map:VectorMap){
 const cache=new Map<string,GeoJSON.Feature<GeoJSON.Point>>()
 map.addSource('walk-dog-retained',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
 map.addLayer({id:'walk-dog-retained-dot',type:'circle',source:'walk-dog-retained',minzoom:10,maxzoom:16,layout:{visibility:'none'},paint:{'circle-radius':5,'circle-color':'#244d3c','circle-stroke-color':'#fffdf7','circle-stroke-width':2}})
 map.addLayer({id:'walk-dog-retained-label',type:'symbol',source:'walk-dog-retained',minzoom:10,maxzoom:16,layout:{visibility:'none','text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':12,'text-allow-overlap':true,'text-ignore-placement':true,'text-offset':[0,1.3],'text-anchor':'top','text-max-width':12},paint:{'text-color':'#244d3c','text-halo-color':'#fffdf7','text-halo-width':2}})
 map.on('idle',()=>{
  if(map.getZoom()<12||map.getLayoutProperty('walk-dog-tile-dot','visibility')==='none')return
  const previous=[...cache.keys()].sort().join('|')
  let changed=false
  for(const feature of map.querySourceFeatures('openmaptiles',{sourceLayer:'poi',filter:dogPlaceFilter})){
   if(feature.geometry.type!=='Point')continue
   const name=String(feature.properties['name:en']||feature.properties.name_en||feature.properties.name||'Dog place'),key=`${feature.geometry.coordinates.join(',')}:${name}`
   if(cache.has(key))continue
   cache.set(key,{type:'Feature',geometry:feature.geometry,properties:{name}});changed=true
  }
  if(!changed)return
  const center=map.getCenter(),position={latitude:center.lat,longitude:center.lng}
  const ranked=[...cache].sort(([a,first],[b,second])=>distance(position,{longitude:first.geometry.coordinates[0],latitude:first.geometry.coordinates[1]})-distance(position,{longitude:second.geometry.coordinates[0],latitude:second.geometry.coordinates[1]})||a.localeCompare(b))
  for(const [key] of ranked.slice(250))cache.delete(key)
  if([...cache.keys()].sort().join('|')===previous)return
  void (map.getSource('walk-dog-retained') as import('maplibre-gl').GeoJSONSource).setData({type:'FeatureCollection',features:[...cache.values()]}).catch(()=>{})
 })
}

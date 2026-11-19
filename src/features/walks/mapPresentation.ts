import type { Map as VectorMap, StyleSpecification, FilterSpecification } from 'maplibre-gl'
import style from './mapStyle.json'
export type MapViewMode = 'standard' | '3d' | 'satellite'
export const MAP_APPROACH_MS=3000
export const SATELLITE_TILES='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
export const SATELLITE_CREDITS='Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community'
export const DOG_PLACE_KINDS=['veterinary','dog_park','pet','pet_grooming','animal_boarding','animal_shelter','animal_training']
export const dogPlaceFilter:FilterSpecification=['any',['in',['get','subclass'],['literal',DOG_PLACE_KINDS]],['in',['get','class'],['literal',DOG_PLACE_KINDS]]]
export function motionDuration(ms:number,reduced=typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches){return reduced?0:ms}
/** Switch basemaps without replacing the route, current-position or POI sources. */
export function applyMapPresentation(map:VectorMap,mode:MapViewMode,dogs:boolean,changeCamera=true){
 if(mode==='satellite'&&!map.getSource('walk-satellite')){
  map.addSource('walk-satellite',{type:'raster',tiles:[SATELLITE_TILES],tileSize:256,maxzoom:19,attribution:SATELLITE_CREDITS})
  map.addLayer({id:'walk-satellite',type:'raster',source:'walk-satellite',paint:{'raster-fade-duration':250}},style.layers[0].id)
 }
 for(const layer of (style as StyleSpecification).layers){
  if(!map.getLayer(layer.id))continue
  map.setLayoutProperty(layer.id,'visibility',mode==='satellite'?'none':layer.layout?.visibility??'visible')
  if('source-layer' in layer&&layer['source-layer']==='poi'&&'filter' in layer){
   const base=layer.filter
   map.setFilter(layer.id,dogs?(base??null):(['all',...(base?[base]:[]),['!',dogPlaceFilter]] as FilterSpecification))
  } else if('source-layer' in layer&&layer['source-layer']==='poi')map.setFilter(layer.id,dogs?null:(['!',dogPlaceFilter] as FilterSpecification))
 }
 if(map.getLayer('walk-satellite'))map.setLayoutProperty('walk-satellite','visibility',mode==='satellite'?'visible':'none')
 if(mode==='3d'&&!map.getLayer('walk-buildings-3d')&&map.getSource('openmaptiles'))map.addLayer({id:'walk-buildings-3d',type:'fill-extrusion',source:'openmaptiles','source-layer':'building',minzoom:14,paint:{'fill-extrusion-color':'#b6c0b0','fill-extrusion-height':['coalesce',['get','render_height'],['get','height'],0],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':.75}},map.getLayer('walk-route-halo')?'walk-route-halo':undefined)
 if(map.getLayer('walk-buildings-3d'))map.setLayoutProperty('walk-buildings-3d','visibility',mode==='3d'?'visible':'none')
 for(const id of ['walk-dog-tile-dot','walk-dog-tile-label','walk-dog-retained-dot','walk-dog-retained-label','dog-places-dot','dog-places-label'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',dogs?'visible':'none')
 // White-backed, larger place labels stay legible against photographic imagery.
 for(const id of ['walk-dog-tile-dot','walk-dog-retained-dot','dog-places-dot'])if(map.getLayer(id)){
  map.setPaintProperty(id,'circle-radius',mode==='satellite'?7:5)
  map.setPaintProperty(id,'circle-stroke-width',mode==='satellite'?3:2)
 }
 for(const id of ['walk-dog-tile-label','walk-dog-retained-label','dog-places-label'])if(map.getLayer(id)){
  map.setLayoutProperty(id,'text-size',mode==='satellite'?13:12)
  map.setPaintProperty(id,'text-color',mode==='satellite'?'#fffdf7':'#244d3c')
  map.setPaintProperty(id,'text-halo-color',mode==='satellite'?'#244d3c':'#fffdf7')
  map.setPaintProperty(id,'text-halo-width',mode==='satellite'?1.8:2)
  map.setPaintProperty(id,'text-halo-blur',mode==='satellite'?1:0)
  map.moveLayer(id)
 }
 if(mode==='3d'){map.dragRotate.enable();map.touchZoomRotate.enableRotation()}else{map.dragRotate.disable();map.touchZoomRotate.disableRotation()}
 if(changeCamera)map.easeTo({pitch:mode==='3d'?55:0,bearing:mode==='3d'?map.getBearing():0,duration:motionDuration(650)})
}

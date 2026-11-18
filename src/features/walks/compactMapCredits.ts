import type { Map as VectorMap } from 'maplibre-gl'
/** Keep mandatory provider credits available without a permanent text strip. */
export function addCompactMapCredits(map:VectorMap,M:Pick<typeof import('maplibre-gl'),'AttributionControl'>){
 const attribution=new M.AttributionControl({compact:false})
 const wrapper=document.createElement('details');wrapper.className='walk-attribution-control maplibregl-ctrl'
 const summary=document.createElement('summary');summary.textContent='i';summary.setAttribute('aria-label','Map credits')
 wrapper.append(summary,attribution.onAdd(map))
 for(const event of ['mousedown','touchstart','click'])wrapper.addEventListener(event,event=>event.stopPropagation(),{passive:true})
 map.addControl({onAdd:()=>wrapper,onRemove:()=>attribution.onRemove()},'bottom-right')
}

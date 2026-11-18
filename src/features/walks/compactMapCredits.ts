import type { Map as VectorMap } from 'maplibre-gl'
/** Provider credits remain readable without a separate information button. */
export function addCompactMapCredits(map:VectorMap,M:Pick<typeof import('maplibre-gl'),'AttributionControl'>){
 map.addControl(new M.AttributionControl({compact:false}),'bottom-right')
}

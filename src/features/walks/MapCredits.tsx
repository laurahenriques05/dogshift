import {useEffect} from 'react'
import {registerMapCredits,type MapCreditMode} from '../../lib/mapCredits'
/** Publish sources to the app footer; render nothing in or alongside the map. */
export function MapCredits({mode='standard'}:{mode?:MapCreditMode;raster?:boolean}){
 useEffect(()=>registerMapCredits(mode),[mode])
 return null
}

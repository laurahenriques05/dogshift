import {useState,useSyncExternalStore} from 'react'
import {areaConsent,setAreaConsent,subscribeAreaConsent} from './walkArea'
import {Button} from '../../components/ui'
export function WalkAreaConsent({scope}:{scope:string}){
 const enabled=useSyncExternalStore(subscribeAreaConsent,()=>areaConsent(scope),()=>false),[error,setError]=useState('')
 function change(value:boolean){try{setAreaConsent(scope,value);setError('')}catch{setError('Could not save this preference. Check browser storage settings.')}}
 return <details className="walk-area-consent"><summary>Walk area names{enabled?' · On':''}</summary><p>Use area names for walks in your account on this device. With your consent, Photon/OpenStreetMap receives one rounded location near the middle of each visible saved route, not the complete route. Results identify an approximate area.</p><Button type="button" className="secondary" onClick={()=>change(!enabled)}>{enabled?'Turn off area names':'Allow area names'}</Button>{error&&<p role="alert">{error}</p>}</details>
}

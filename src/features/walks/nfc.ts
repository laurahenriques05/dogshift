const key='pawshare.pending-walk-start'
type Intent={at:number;household:string|null}
function readIntent():Intent|null{try{const raw=sessionStorage.getItem(key);if(!raw)return null;const value=JSON.parse(raw);return typeof value==='number'?{at:value,household:null}:value&&typeof value.at==='number'&&(value.household===null||typeof value.household==='string')?value:null}catch{return null}}
export function rememberWalkStart(){try{const params=typeof window!=='undefined'?new URLSearchParams(window.location.search):null;if(params&&params.get('action')!=='start')return;const household=params?.get('household')??null;const previous=pendingWalkStart()?readIntent():null;sessionStorage.setItem(key,JSON.stringify({at:Date.now(),household:household??previous?.household??null}))}catch{/* Reopen the collar link if session storage is disabled. */}}
export function pendingWalkStart(now=Date.now()){const value=readIntent();return !!value&&value.at>0&&now>=value.at&&now-value.at<30*60_000}
export function pendingWalkHousehold(){return pendingWalkStart()?readIntent()?.household??null:null}
export function clearWalkStart(){try{sessionStorage.removeItem(key)}catch{/* Confirmation remains explicit. */}}
export function collarTagUrl(base:string,household:string){const url=new URL('/walks',base);url.searchParams.set('action','start');url.searchParams.set('household',household);return url.toString()}

export function collarMatchesHousehold(tagHousehold:string|null,currentHousehold:string){return tagHousehold===null||tagHousehold===currentHousehold}

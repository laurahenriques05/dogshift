import { useEffect, useRef, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function WalkConnectionAlert({active,failed=false,onReconnect}:{active:boolean;failed?:boolean;onReconnect?:()=>Promise<boolean>}){
 const [online,setOnline]=useState(()=>navigator.onLine),[dismissed,setDismissed]=useState(false),[busy,setBusy]=useState(false),[retryFailed,setRetryFailed]=useState(false)
 const button=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLElement>(null)
 const disconnected=active&&(!online||failed)
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[])
 useEffect(()=>{if(!disconnected){setDismissed(false);setRetryFailed(false)}},[disconnected])
 const open=disconnected&&!dismissed
 useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;dialog.current?.focus();return()=>previous?.focus()},[open])
 if(!open)return null
 return <div className="walk-dialog-backdrop walk-connection-backdrop"><section ref={dialog} tabIndex={-1} className="walk-connection-dialog" role="alertdialog" aria-modal="true" aria-labelledby="walk-connection-title" onKeyDown={event=>{if(event.key==='Escape')setDismissed(true);if(event.key==='Tab'){event.preventDefault();button.current?.focus()}}}><span className="walk-connection-symbol"><WifiOff size={36} strokeWidth={1.7} aria-hidden="true"/></span><h2 id="walk-connection-title">Connection lost</h2><p>Keep this page open. Reconnect to save any pending route points and your finish request. Retry this recording rather than starting another walk.</p>{retryFailed&&<p role="status">Still unable to save. Check your connection and try again. Your recording remains open.</p>}<button type="button" className="button" ref={button} disabled={busy} onClick={async()=>{if(busy)return;setBusy(true);setRetryFailed(false);try{const connected=onReconnect?await onReconnect():navigator.onLine;if(connected)setDismissed(true);else setRetryFailed(true)}catch{setRetryFailed(true)}finally{setBusy(false)}}}>{busy?'Reconnecting…':'Reconnect'}</button></section></div>
}

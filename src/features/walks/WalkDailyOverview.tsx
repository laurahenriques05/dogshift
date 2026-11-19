import { useState } from 'react'
import { ArrowRight, Copy, Nfc } from 'lucide-react'
import type { Walk } from '../../lib/supabase/database.types'
import { appUrl } from '../../lib/supabase/client'
import { Button } from '../../components/ui'
import { CollarNfcArt } from './CollarNfcArt'
import type { DailyWalkRoutine } from './useDailyWalkRoutine'
import { startedToday, lastRecordedStart, nextRoutineSlot } from './routinePresentation'
import { collarTagUrl } from './nfc'
export function WalkDailyOverview({routine,walks,zone,dogName,household,busy,onStart}:{routine:DailyWalkRoutine;walks:Walk[];zone:string;dogName:string;household:string;busy:boolean;onStart:()=>void}){
 const [setup,setSetup]=useState(false),[copyStatus,setCopyStatus]=useState('')
 const next=routine.ready?nextRoutineSlot(routine.slots):undefined,last=lastRecordedStart(walks)
 const count=startedToday(walks,routine.day,zone).length
 const title=routine.loading?'Your next adventure':!routine.ready||routine.count===undefined?'A new adventure awaits':!routine.scheduleComplete?'Complete your walking routine':next?(routine.names[next.number-1]??'Your next walk'):'Today’s routine is complete'
 const url=collarTagUrl(appUrl,household)
 const time=last?new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(last)):null
 return <section className="card walk-daily-overview" aria-labelledby="walk-next-title"><div className="walk-next-copy">{routine.ready&&routine.scheduleComplete&&<p className="eyebrow">NEXT WALK</p>}<h2 id="walk-next-title">{title}</h2><p>Every walk has a story. Record the little moments along the way.</p><Button disabled={busy} onClick={onStart}>Start walk<ArrowRight size={18} aria-hidden="true"/></Button></div>
  <div className="walk-overview-progress"><p role="status"><strong>{routine.loading?'—':count}</strong><span>{routine.ready&&routine.count!==undefined?count>routine.count?`walks today · ${routine.count} planned`:`of ${routine.count} walks started today`:'walks started today'}</span></p>{routine.ready&&routine.count!==undefined&&<progress value={count} max={routine.count} aria-label="Daily walks started"/>}{time&&<small>Last recorded start: <time dateTime={last}>{time}</time></small>}</div>
  <div className="walk-collar-setup"><CollarNfcArt dogName={dogName}/><button type="button" className="walk-collar-setup-toggle" aria-expanded={setup} onClick={()=>setSetup(v=>!v)}><Nfc size={16} aria-hidden="true"/>Set up collar tag</button></div>
  {setup&&<div className="walk-collar-setup-body"><h3>Walks from the collar</h3><p>Save this link on the collar’s NFC tag. Tapping it opens PawShare’s Start walk setup after sign-in.</p><code>{url}</code><Button className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(url);setCopyStatus('Collar link copied.')}catch{setCopyStatus('Copy the link above manually.')}}}><Copy size={15} aria-hidden="true"/>Copy collar link</Button><small>Configure a writable tag once with a compatible NFC writer. On iPhone, use a trusted tag-writing app. Everyday tapping needs no writer app.</small>{copyStatus&&<p role="status">{copyStatus}</p>}</div>}
 </section>
}

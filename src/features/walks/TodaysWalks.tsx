import { useState } from 'react'
import { Check, Circle, Footprints, LoaderCircle, Pencil } from 'lucide-react'
import { Button, Field } from '../../components/ui'
import type { DailyWalkRoutine } from './useDailyWalkRoutine'
import { routineNames, validRoutineTimes } from './routineSchedule'
import { WalkRoutineSummary } from './WalkRoutineSummary'

export function TodaysWalks({routine,user,zone}:{routine:DailyWalkRoutine;user:string;zone:string}){
 const [mode,setMode]=useState<'setup'|'edit'|null>(null)
 const editing=mode!==null
 const [value,setValue]=useState('3'),[times,setTimes]=useState<string[]>([])
 const [selected,setSelected]=useState<number|null>(null),[saving,setSaving]=useState<number|null>(null),[feedback,setFeedback]=useState('')
 const name=(number:number)=>routine.names?.[number-1]??''
 const preview=routineNames(Array.from({length:Math.max(1,Math.min(12,Number(value)||1))},(_,i)=>times[i]??''))
 const slot=routine.slots.find(item=>item.number===selected)
 function edit(next:'setup'|'edit'){setValue(String(routine.count??3));setTimes(routine.times);setMode(next);setFeedback('')}
 function changeTime(index:number,time:string){
  setTimes(previous=>Array.from({length:Math.max(previous.length,index+1)},(_,i)=>i===index?time:previous[i]??''))
 }
 async function withoutRoutine(){
  if(await routine.saveCount(undefined)){setMode(null);setFeedback('Walking without a routine. You can set one anytime.')}
 }
 return <div className="walk-routine-layout"><section className={`card walk-today${routine.ready&&!routine.scheduleComplete&&!editing?' is-unconfigured':''}`}>
  <header className="walk-today-heading">
   <h2><span className="icon-tile"><Footprints size={28} aria-hidden="true"/></span>{routine.count===undefined||!routine.scheduleComplete?'Walking routine':'Today’s walk'}</h2>
  </header>
  {routine.loading?<p role="status">Loading today’s walks…</p>:<>
   {feedback&&<p role="status">{feedback}</p>}
   {routine.error&&<p role="alert">{routine.error} <button type="button" className="walk-text-action" onClick={routine.retry}>Retry</button></p>}
   {routine.ready&&<>
    {routine.count!==undefined&&!routine.scheduleComplete&&!editing&&<p role="status">Complete your routine’s estimated times to name each walk.</p>}
    {routine.count===undefined||!routine.scheduleComplete?<>
     {!editing&&<div className="walk-routine-setup"><Button disabled={routine.busy} onClick={()=>edit('setup')}>Set routine</Button></div>}
    </>:<ol className="walk-routine-line dose-bubbles" aria-label="Today's walk routine">
     {routine.slots.map(item=>{
      const complete=!!(item.walk||item.manual),label=name(item.number)
      return <li key={`${routine.day}-${item.number}`} className={`dose-step${complete?' is-given':''}`}>
       <button type="button" className={`dose-bubble walk-period-bubble${complete?' is-given':''}`} disabled={routine.busy}
        aria-label={complete?`${label||'Walk'} recorded. View summary`:`Mark ${label||'Walk'} as done`} aria-busy={saving===item.number}
        onClick={async()=>{
         if(complete){setSelected(item.number);return}
         if(routine.busy)return
         setSaving(item.number)
         try{await routine.mark(item.number)}finally{setSaving(null)}
        }}>
        {label&&<strong>{label}</strong>}
        <span className="dose-bubble-mark" aria-hidden="true">{saving===item.number?<LoaderCircle size={19} className="walk-routine-saving"/>:complete?<Check size={23} strokeWidth={1.8} className="walk-check-mark"/>:<Circle size={17} strokeWidth={1.8}/>}</span>
       </button>
       {complete&&<button type="button" className="dose-detail-link" aria-expanded={selected===item.number} onClick={()=>setSelected(item.number)}>Summary</button>}
      </li>
     })}
    </ol>}
    {editing&&<form className="walk-plan-form" onSubmit={async event=>{
     event.preventDefault()
     if(routine.busy)return
     const form=new FormData(event.currentTarget),count=Number(form.get('walk-count')),estimates=form.getAll('walk-time').map(String)
     if(!validRoutineTimes(estimates,count)){setFeedback('Choose an estimated time for every walk.');return}
     if(await routine.saveCount(count,estimates)){setMode(null);setFeedback('Walking routine saved.')}
    }}>
     <Field label="Walks per day" name="walk-count" type="number" min={1} max={12} step={1} required disabled={routine.busy} value={value} onChange={event=>setValue(event.target.value)}/>
     <div className="walk-routine-times"><p>Estimated times</p>
      {Array.from({length:Math.max(1,Math.min(12,Number(value)||1))},(_,i)=><Field key={i} label={preview[i]||`Estimated time ${i+1}`} name="walk-time" type="time" required disabled={routine.busy} value={times[i]??''}
       onInput={event=>changeTime(i,event.currentTarget.value)} onChange={event=>changeTime(i,event.target.value)} onBlur={event=>changeTime(i,event.target.value)}/>)}
     </div>
     <div className="walk-actions">
      <Button type="submit" disabled={routine.busy}>Save routine</Button>
      <Button type="button" className="secondary" disabled={routine.busy} onClick={()=>setMode(null)}>Cancel</Button>
      {mode==='edit'&&<Button type="button" className="secondary" disabled={routine.busy} onClick={()=>void withoutRoutine()}>Remove routine</Button>}
     </div>
    </form>}
   </>}
  </>}
  {slot&&routine.count!==undefined&&(slot.walk||slot.manual)&&<WalkRoutineSummary key={`${routine.day}-${slot.number}`} slot={slot} label={name(slot.number)} user={user} zone={zone} routine={routine} onClose={()=>setSelected(null)}/>}
 </section><button type="button" className="walk-routine-edit-tile" disabled={!routine.ready||!routine.scheduleComplete||routine.busy||editing} onClick={()=>edit('edit')}><Pencil size={28} aria-hidden="true"/><span>Edit routine</span></button></div>
}

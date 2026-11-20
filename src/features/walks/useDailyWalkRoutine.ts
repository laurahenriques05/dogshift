import { routineNames, validRoutineTimes } from './routineSchedule'
import { recordedWalksToday } from './routinePresentation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Walk } from '../../lib/supabase/database.types'
import { localDay } from './gps'
import { dailySlots, readDailyWalks, saveDailyCount, markDailyWalk, undoDailyWalk, type DailyCheck } from './dailyWalks'
export function useDailyWalkRoutine({dog,walks,zone,now,enabled=true}:{dog:string;walks:Walk[];zone:string;now:number;enabled?:boolean}){
 const day=localDay(new Date(now).toISOString(),zone)
 const [times,setTimes]=useState<string[]>([]),[decided,setDecided]=useState(false)
 const [count,setCount]=useState<number|undefined>(),[checks,setChecks]=useState<DailyCheck[]>([]),[loading,setLoading]=useState(true),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0)
 const lock=useRef(false),loaded=useRef(''),pending=useRef<{id:string;slot:number;day:string}|null>(null)
 useEffect(()=>{if(!enabled)return;let alive=true;const key=dog+day;if(loaded.current!==key){setLoading(true);setReady(false);setChecks([])}void readDailyWalks(dog,day).then(data=>{if(alive){loaded.current=key;setCount(data.count);setTimes(data.times);setDecided(data.decided);setChecks(data.checks);setReady(true);setError('')}}).catch(()=>{if(alive){setReady(false);setError('Daily walks are unavailable. Retry shortly.')}}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[dog,day,revision,enabled])
 useEffect(()=>{if(!enabled)return;const refresh=()=>setRevision(n=>n+1);const timer=setInterval(()=>{if(!document.hidden)refresh()},30000);window.addEventListener('online',refresh);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh)}},[enabled])
 async function act(action:()=>Promise<void>){if(lock.current)return false;lock.current=true;setBusy(true);setError('');try{await action();setRevision(n=>n+1);return true}catch{setError('Could not save. Please retry.');return false}finally{lock.current=false;setBusy(false)}}
 const slots=useMemo(()=>dailySlots(count??0,walks,checks,day,zone,times),[count,walks,checks,day,zone,times]),done=slots.filter(slot=>slot.walk?.ended_at||slot.manual).length
 const names=routineNames(times),scheduleComplete=count!==undefined&&validRoutineTimes(times,count)
 return {day,count,times,names,scheduleComplete,decided,slots,done,recordedCount:recordedWalksToday(walks,checks,day,zone),loading,ready,busy,error,retry:()=>setRevision(n=>n+1),saveCount:(value:number|undefined,times:string[]=[])=>act(async()=>{const ordered=[...times].sort();await saveDailyCount(dog,value,ordered);setCount(value);setTimes(ordered);setDecided(true)}),mark:(number:number)=>act(async()=>{if(!pending.current||pending.current.slot!==number||pending.current.day!==day)pending.current={id:crypto.randomUUID(),slot:number,day};await markDailyWalk(pending.current.id,dog,day,number);pending.current=null}),undo:(id:string)=>act(()=>undoDailyWalk(id))}
}
export type DailyWalkRoutine=ReturnType<typeof useDailyWalkRoutine>

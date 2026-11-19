import{expect,it,afterEach,vi}from'vitest'
import{walkPeriod,nextRoutineSlot,completedToday,lastRecordedStart,recordedWalksToday,startedToday}from'../features/walks/routinePresentation'
import{collarTagUrl,rememberWalkStart,pendingWalkStart,pendingWalkHousehold,clearWalkStart,collarMatchesHousehold}from'../features/walks/nfc'
import type{Walk}from'../lib/supabase/database.types'
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()})
it('labels the configured count by periods and chooses only a genuinely unfinished slot',()=>{
 expect([1,2,3].map(n=>walkPeriod(n,3))).toEqual(['Morning','Afternoon','Night'])
 expect([1,2].map(n=>walkPeriod(n,2))).toEqual(['Morning','Night'])
 expect(new Set(Array.from({length:12},(_,i)=>walkPeriod(i+1,12))).size).toBe(12)
 const done={number:1,walk:{id:'saved'} as Walk},pending={number:2}
 expect(nextRoutineSlot([done,pending])).toBe(pending);expect(nextRoutineSlot([done])).toBeUndefined()
})
it('uses real completed records for the household day and preserves the exact latest start',()=>{
 const walk={id:'a',started_at:'2026-01-01T13:14:15Z',ended_at:'2026-01-01T14:00:00Z',deleted_at:null} as Walk
 const deleted={...walk,id:'b',started_at:'2026-01-01T18:00:00Z',deleted_at:'2026-01-01T19:00:00Z'}
 const active={...walk,id:'c',started_at:'2026-01-01T15:16:17Z',ended_at:null}
 expect(completedToday([walk,walk,deleted,active],'2026-01-02','Pacific/Kiritimati')).toEqual([walk])
 expect(lastRecordedStart([walk,deleted,active])).toBe(active.started_at)
 expect(recordedWalksToday([walk,walk,deleted,active],[],'2026-01-02','Pacific/Kiritimati')).toBe(1)
})
it('preserves the collar household through sign-in, expires intent and rejects a mismatched family',()=>{
 const values=new Map<string,string>();vi.stubGlobal('sessionStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)})
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
 vi.stubGlobal('window',{location:{search:'?action=start&household=family-a'}});rememberWalkStart()
 expect(pendingWalkHousehold()).toBe('family-a')
 vi.stubGlobal('window',{location:{search:'?action=start'}});rememberWalkStart()
 expect(pendingWalkHousehold()).toBe('family-a');expect(collarMatchesHousehold(pendingWalkHousehold(),'family-b')).toBe(false)
 expect(collarMatchesHousehold(pendingWalkHousehold(),'family-a')).toBe(true)
 const url=new URL(collarTagUrl('https://pawshare.example','family-a'));expect(url.pathname).toBe('/walks');expect(url.searchParams.get('household')).toBe('family-a')
 vi.advanceTimersByTime(30*60_000);expect(pendingWalkStart()).toBe(false);clearWalkStart();expect(pendingWalkHousehold()).toBeNull()
 vi.stubGlobal('window',{location:{search:''}});rememberWalkStart();expect(pendingWalkStart()).toBe(false)
})

it('counts actual starts including an active walk once, ignoring deleted and previous household days',()=>{
 const base={id:'one',started_at:'2026-01-01T23:40:00Z',ended_at:null,deleted_at:null} as Walk
 expect(startedToday([base,base,{...base,id:'deleted',deleted_at:'2026-01-02T00:00:00Z'},{...base,id:'previous',started_at:'2025-12-31T00:00:00Z'}],'2026-01-02','Pacific/Kiritimati')).toEqual([base])
 expect(startedToday([], '2026-01-02','Pacific/Kiritimati')).toHaveLength(0)
 expect(lastRecordedStart([])).toBeUndefined()
})

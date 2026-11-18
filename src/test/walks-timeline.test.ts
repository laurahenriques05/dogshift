import { describe, expect, it } from 'vitest'
import { walkTimeline } from '../features/walks/timelineEvents'
import { canRecordWaste, wastePanelVisible, type WasteEvent } from '../features/walks/waste'
import type { Point } from '../features/walks/gps'
const start='2026-11-18T10:00:00.000Z',end='2026-11-18T10:10:00.000Z'
const waste:WasteEvent[]=[{id:'p',walk_id:'w',kind:'pee',recorded_at:'2026-11-18T10:03:00.000Z'}]
const points:Point[]=Array.from({length:13},(_,seq)=>({seq,latitude:0,longitude:seq*.0005,accuracy:5,recorded_at:new Date(Date.parse(start)+seq*30000).toISOString()}))
describe('honest walk timeline and final-only waste',()=>{
 it('hides final-only waste controls throughout an active walk and offers them at ending/summary',()=>{
  expect(wastePanelVisible('end',false,false)).toBe(false)
  expect(canRecordWaste('end',false,false,true,false)).toBe(false)
  expect(canRecordWaste('end',false,true,true,false)).toBe(true)
  expect(canRecordWaste('end',true,false,true,false)).toBe(true)
  expect(canRecordWaste('during',false,false,true,false)).toBe(true)
  expect(canRecordWaste('during',false,true,true,false)).toBe(false)
  expect(canRecordWaste('during',true,false,true,false)).toBe(false)
  expect(canRecordWaste('during',false,false,false,false)).toBe(false)
  expect(canRecordWaste('during',false,false,true,true)).toBe(false)
  expect(canRecordWaste('off',true,true,true,false)).toBe(false)
 })
 it('never places end-only records in the journey timeline, even after finishing',()=>{
  for(const ended_at of [null,end])expect(walkTimeline({started_at:start,ended_at},points,'end',waste).some(entry=>entry.id.startsWith('waste-'))).toBe(false)
 })
 it('uses original timestamps for during-walk records and deduplicates retries',()=>{
  const entries=walkTimeline({started_at:start,ended_at:end},points,'during',[...waste,...waste])
  expect(entries.filter(entry=>entry.id==='waste-p')).toEqual([{id:'waste-p',at:waste[0].recorded_at,label:'Pee recorded'}])
  expect(entries[0].id).toBe('start');expect(entries.at(-1)?.id).toBe('finish')
 })
 it('orders equivalent ISO timestamps chronologically with start first',()=>{
  expect(walkTimeline({started_at:'2026-11-18T10:00:00Z',ended_at:null},[points[0]],'off',[]).map(entry=>entry.id)).toEqual(['start','gps-start'])
 })
 it('derives distance milestones and gaps only from accepted continuous route segments',()=>{
  const entries=walkTimeline({started_at:start,ended_at:end},points,'off',[])
  expect(entries.some(entry=>entry.label==='0.5 km recorded')).toBe(true)
  const gap=[points[0],{...points[12],recorded_at:end}]
  const missing=walkTimeline({started_at:start,ended_at:end},gap,'off',[])
  expect(missing.some(entry=>entry.id.startsWith('gap-'))).toBe(true)
  expect(missing.some(entry=>entry.id.startsWith('distance-'))).toBe(false)
  expect(missing.some(entry=>/entered|visited/i.test(entry.label))).toBe(false)
 })
})

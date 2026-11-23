import { describe, expect, it, vi } from 'vitest'
import { flushNativePoints, mergeRoute, scopedRecording, type NativeRecording, type WalkRecorderPlugin } from '../features/walks/native/bridge'
import type { Point } from '../features/walks/gps'
const scope={user:'owner',household:'family',walk:'walk'}
const point=(seq:number):Point=>({seq,latitude:38,longitude:-9,accuracy:8,recorded_at:new Date(1_790_000_000_000+seq*5000).toISOString()})
const session=(points:Point[]=[]):NativeRecording=>({...scope,startedAt:point(0).recorded_at,gps:true,state:'recording',points,nextSeq:points.length,pauses:[],autoEnd:true,error:''})
function recorder(s:NativeRecording){
 return {snapshot:vi.fn(async()=>({session:{...s,points:[...s.points]}})),acknowledge:vi.fn(async({through}:{through:number})=>{s.points=s.points.filter(p=>p.seq>through);return {session:s}})} as unknown as WalkRecorderPlugin
}
describe('native durable GPS queue',()=>{
 it('blocks another account, family or walk before upload',async()=>{
  for(const different of [{user:'other'},{household:'other'},{walk:'other'}])expect(()=>scopedRecording({session:{...session(),...different}},scope)).toThrow('original account')
  const native=recorder({...session([point(0)]),user:'other'}),save=vi.fn()
  await expect(flushNativePoints(native,scope,save,vi.fn())).rejects.toThrow();expect(save).not.toHaveBeenCalled();expect(native.acknowledge).not.toHaveBeenCalled()
 })
 it('does not acknowledge or discard a rejected server batch',async()=>{
  const native=recorder(session([point(0)])),saved=vi.fn()
  await expect(flushNativePoints(native,scope,async()=>{throw Error('permission denied')},saved)).rejects.toThrow('permission denied')
  expect(native.acknowledge).not.toHaveBeenCalled();expect(saved).not.toHaveBeenCalled()
 })
 it('uploads ordered 500-point batches and acknowledges only after acceptance',async()=>{
  const s=session(Array.from({length:1001},(_,i)=>point(i))),native=recorder(s),events:string[]=[]
  const ack=native.acknowledge;native.acknowledge=vi.fn(async input=>{events.push(`ack:${input.through}`);return ack(input)})
  await flushNativePoints(native,scope,async batch=>{events.push(`save:${batch.length}`)},()=>{})
  expect(events).toEqual(['save:500','ack:499','save:500','ack:999','save:1','ack:1000']);expect(s.points).toEqual([])
 })
 it('replays the exact same points if native acknowledgement failed',async()=>{
  const s=session([point(0)]),native=recorder(s),save=vi.fn(async()=>{})
  vi.mocked(native.acknowledge).mockRejectedValueOnce(Error('storage unavailable'))
  await expect(flushNativePoints(native,scope,save,()=>{})).rejects.toThrow()
  await flushNativePoints(native,scope,save,()=>{})
  expect(save.mock.calls).toHaveLength(2);expect(save.mock.calls[0]).toEqual(save.mock.calls[1])
 })
 it('merges idempotently, preserves real segment breaks and rejects sequence conflicts',()=>{
  const p={...point(1),segment_start:true}
  expect(mergeRoute([point(0),p],[p])).toEqual([point(0),p])
  expect(()=>mergeRoute([p],[{...p,segment_start:false}])).toThrow('sequence conflict')
  expect(()=>mergeRoute([p],[{...p,latitude:39}])).toThrow('sequence conflict')
 })
 it('surfaces native storage errors without clearing a recording',()=>{expect(()=>scopedRecording({session:session(),error:'Storage failed'},scope)).toThrow('Storage failed')})
})

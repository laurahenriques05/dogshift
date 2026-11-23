import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import type { Point } from '../gps'
import type { WalkPause } from '../pauseClock'

export type Scope = { user: string; household: string; walk?: string }
export type NativeRecording = {
 user: string; household: string; walk: string; startedAt: string; gps: boolean;
 state: 'ready'|'recording'|'paused'|'connectionLost'|'interrupted'|'denied'|'ending';
 points: Point[]; lastPoint?: Point; nextSeq: number; pauses: WalkPause[];
 ending?: { at: string; reason: 'manual'|'stationary' }; autoEnd: boolean; warning?: number; error: string;
}
export type Snapshot = { session: NativeRecording|null; error?: string }
export interface WalkRecorderPlugin {
 prepare(options: Scope & {walk:string;startedAt:string;gps:boolean;nextSeq:number;lastPoint?:Point}):Promise<Snapshot>;
 snapshot(scope:Scope):Promise<Snapshot>;
 start(scope:Scope):Promise<Snapshot>;
 pause(scope:Scope):Promise<Snapshot>;
 interrupt(scope:Scope):Promise<Snapshot>;
 finish(scope:Scope):Promise<Snapshot>;
 acknowledge(options:Scope & {through:number}):Promise<Snapshot>;
 clear(scope:Scope):Promise<Snapshot>;
 keepWalking(scope:Scope):Promise<Snapshot>;
 setAutoEnd(options:Scope & {enabled:boolean}):Promise<Snapshot>;
 suspend(scope:Scope):Promise<Snapshot>;
 addListener(name:'changed',listener:()=>void):Promise<PluginListenerHandle>;
}
export const walkRecorder = registerPlugin<WalkRecorderPlugin>('WalkRecorder')

export function scopedRecording(snapshot:Snapshot, scope:Scope):NativeRecording|null {
 if(snapshot.error)throw new Error(snapshot.error)
 const s=snapshot.session
 if(s&&(s.user!==scope.user||s.household!==scope.household||(scope.walk&&s.walk!==scope.walk)))throw new Error('The saved recording belongs to another account, family or walk. Use its original account to save it first.')
 return s
}
export function mergeRoute(saved:Point[],queued:Point[]):Point[] {
 const bySeq=new Map(saved.map(p=>[p.seq,p]))
 for(const p of queued){const old=bySeq.get(p.seq);if(old&&(old.recorded_at!==p.recorded_at||old.latitude!==p.latitude||old.longitude!==p.longitude||old.accuracy!==p.accuracy||!!old.segment_start!==!!p.segment_start))throw new Error('GPS sequence conflict. Keep the original device and do not start another walk.');bySeq.set(p.seq,p)}
 return [...bySeq.values()].sort((a,b)=>a.seq-b.seq)
}
// Acknowledgement is only allowed after the server accepts that exact batch.
export async function flushNativePoints(recorder:WalkRecorderPlugin,scope:Scope,save:(points:Point[])=>Promise<void>,onSaved:(points:Point[])=>void) {
 for(;;){
  const session=scopedRecording(await recorder.snapshot(scope),scope)
  const batch=session?.points.slice(0,500)??[]
  if(!batch.length)return
  await save(batch)
  onSaved(batch)
  await recorder.acknowledge({...scope,through:batch[batch.length-1].seq})
 }
}

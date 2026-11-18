import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {afterAll,beforeAll,describe,it,expect} from 'vitest'
import {duration,segment,acceptable,type Point} from '../features/walks/gps'
import {closePause,validPauses} from '../features/walks/pauseClock'
import {mapSegments} from '../features/walks/mapGeometry'
import {parseBuffer,mergeBuffer} from '../features/walks/buffer'
import {parseNoteDraft,noteDraftKey} from '../features/walks/noteDraft'
const sql=new PGlite(),a='90000000-0000-0000-0000-000000000001',b='90000000-0000-0000-0000-000000000002',c='90000000-0000-0000-0000-000000000003'
let dog:string,home:string,walk:string
async function asUser(id:string){await sql.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`)}
beforeAll(async()=>{
 await sql.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`)
 for(const name of ['202611070001_initial_schema.sql','202611110001_walks.sql','20261118200000_walk_pause_and_notes.sql','20261118223000_walk_paused_duration.sql'])await sql.exec(readFileSync(`supabase/migrations/${name}`,'utf8'))
 await sql.exec(`insert into auth.users(id) values('${a}'),('${b}'),('${c}')`);await asUser(a)
 home=(await sql.query<{id:string}>("select public.create_household('Pause test','Europe/Lisbon') id")).rows[0].id
 dog=(await sql.query<{id:string}>("insert into public.dogs(household_id,name) values($1,'Milo') returning id",[home])).rows[0].id
 await sql.exec(`reset role;insert into public.household_members(household_id,user_id,role) values('${home}','${b}','member')`);await asUser(a)
 walk=(await sql.query<{id:string}>('select id from public.start_walk($1)',[dog])).rows[0].id
},30000)
afterAll(()=>sql.close())
describe('GPS pause breaks and note permissions (isolated database)',()=>{
 it('saves only the author’s note without changing walk times, supports lost-response retry and rejects stale replacements',async()=>{
  const first=(await sql.query<{started_at:string;notes:string}>('select * from public.set_walk_note($1,$2,$3)',[walk,' Good walk ',''])).rows[0]
  expect(first.notes).toBe('Good walk')
  expect((await sql.query<{notes:string}>('select * from public.set_walk_note($1,$2,$3)',[walk,'Good walk',''])).rows[0].notes).toBe('Good walk')
  await expect(sql.query('select public.set_walk_note($1,$2,$3)',[walk,'overwrite',''])).rejects.toThrow('another device')
  await expect(sql.query('select public.set_walk_note($1,$2,$3)',[walk,'x'.repeat(2001),'Good walk'])).rejects.toThrow('2000')
  for(const user of [b,c]){await asUser(user);await expect(sql.query('select public.set_walk_note($1,$2,$3)',[walk,'no','Good walk'])).rejects.toThrow('access')}
  await asUser(a)
  expect((await sql.query<{started_at:string;notes:string;ended_at:string|null}>('select * from public.walks where id=$1',[walk])).rows[0]).toMatchObject({started_at:first.started_at,notes:'Good walk',ended_at:null})
 })
 it('persists segment boundaries, does not count a paused jump and detects conflicting boundary retries',async()=>{
  const start=(await sql.query<{started_at:string}>('select started_at from public.walks where id=$1',[walk])).rows[0].started_at
  await sql.exec(`reset role;update public.walks set started_at=clock_timestamp()-interval '1 minute' where id='${walk}'`);await asUser(a)
  const t=Date.now()-50000
  const points=[{seq:0,recorded_at:new Date(t).toISOString(),latitude:0,longitude:0,accuracy:3},{seq:1,recorded_at:new Date(t+10000).toISOString(),latitude:0,longitude:.001,accuracy:3,segment_start:true},{seq:2,recorded_at:new Date(t+20000).toISOString(),latitude:0,longitude:.0011,accuracy:3}]
  expect(start).toBeTruthy()
  await sql.query('select public.append_walk_points($1,$2::jsonb)',[walk,JSON.stringify(points)])
  await sql.query('select public.append_walk_points($1,$2::jsonb)',[walk,JSON.stringify(points)])
  await expect(sql.query('select public.append_walk_points($1,$2::jsonb)',[walk,JSON.stringify([{...points[1],segment_start:false}])])).rejects.toThrow('conflict')
  const result=(await sql.query<{distance_m:number}>('select * from public.finish_walk($1,clock_timestamp(),$2)',[walk,'manual'])).rows[0]
  expect(result.distance_m).toBeGreaterThan(10);expect(result.distance_m).toBeLessThan(12)
  await sql.query('select public.set_walk_deleted($1,true)',[walk])
  await expect(sql.query('select public.set_walk_note($1,$2,$3)',[walk,'no','Good walk'])).rejects.toThrow('access')
 })
})
it('does not draw or count a short pause, but accepts a real resume fix beyond the old speed limit',()=>{
 const time=Date.now(),point=(seq:number,longitude:number):Point=>({seq,latitude:0,longitude,accuracy:3,recorded_at:new Date(time+seq*10000).toISOString()})
 const points=[point(0,0),{...point(1,.001),segment_start:true},point(2,.0011)]
 expect(segment(points[0],points[1])).toBe(0)
 expect(acceptable(points[1],points[0],time+10000)).toBe(true)
 expect(mapSegments(points)).toHaveLength(1);expect(mapSegments(points)[0]).toHaveLength(2)
})
it('recovers pause intent, rejects invalid flags and keeps the newest cross-tab pause state',()=>{
 const buffer={walk:'w',points:[],ending:null,paused:true,pauseUpdatedAt:200}
 expect(parseBuffer(JSON.stringify(buffer),'w')).toEqual(buffer)
 expect(parseBuffer(JSON.stringify({...buffer,paused:'yes'}),'w')).toBeNull()
 expect(mergeBuffer({...buffer,paused:false,pauseUpdatedAt:100},buffer).paused).toBe(true)
 expect(mergeBuffer(buffer,{...buffer,paused:false,pauseUpdatedAt:300}).paused).toBe(false)
})
it('isolates and validates recoverable note drafts by user and walk',()=>{
 expect(noteDraftKey('a','walk')).not.toBe(noteDraftKey('b','walk'))
 expect(parseNoteDraft(JSON.stringify({text:'A note',expected:''}))).toEqual({text:'A note',expected:''})
 expect(parseNoteDraft('{broken')).toBeNull();expect(parseNoteDraft(JSON.stringify({text:'x'.repeat(2001),expected:''}))).toBeNull()
})

it('freezes elapsed time while paused, resumes without counting the gap and recovers the finish note',()=>{
 const start=Date.parse('2026-01-01T10:00:00Z'),walk={started_at:new Date(start).toISOString(),ended_at:null}
 const pauses=[{start:new Date(start+20000).toISOString(),end:null}]
 expect(duration(walk,start+30000,pauses)).toBe(20)
 expect(duration(walk,start+90000,pauses)).toBe(20)
 const closed=closePause(pauses,new Date(start+90000).toISOString())
 expect(duration(walk,start+100000,closed)).toBe(30)
 expect(duration({...walk,ended_at:new Date(start+100000).toISOString(),pause_intervals:closed} as {started_at:string;ended_at:string|null},start+999999)).toBe(30)
 const value={walk:'timer',points:[],paused:true,pauses,ending:{at:new Date(start+100000).toISOString(),reason:'manual',note:{text:'A calm afternoon.',expected:''}}}
 expect(parseBuffer(JSON.stringify(value),'timer')?.ending?.note?.text).toBe('A calm afternoon.')
 expect(validPauses([{start:'invalid',end:null}])).toBe(false)
 expect(validPauses([...pauses,...pauses])).toBe(false)
})
it('saves author pause intervals atomically, supports a lost finish acknowledgement and rejects invalid/member attempts',async()=>{
 await asUser(a)
 const id=(await sql.query<{id:string}>('select id from public.start_walk($1)',[dog])).rows[0].id
 const start=Date.now()-120000,end=new Date(start+100000).toISOString(),pauses=[{start:new Date(start+20000).toISOString(),end:new Date(start+70000).toISOString()}]
 await sql.exec(`reset role;update public.walks set started_at='${new Date(start).toISOString()}' where id='${id}'`)
 for(const user of [b,c]){await asUser(user);await expect(sql.query('select public.finish_walk_with_pauses($1,$2,$3,$4)',[id,end,'manual',JSON.stringify(pauses)])).rejects.toThrow('access')}
 await asUser(a)
 await expect(sql.query('select public.finish_walk_with_pauses($1,$2,$3,$4)',[id,end,'manual',JSON.stringify([{...pauses[0],end:new Date(start+150000).toISOString()}])])).rejects.toThrow('pause interval')
 expect((await sql.query<{ended_at:string|null}>('select ended_at from public.walks where id=$1',[id])).rows[0].ended_at).toBeNull()
 const result=(await sql.query<{started_at:string;ended_at:string;pause_intervals:typeof pauses}>('select * from public.finish_walk_with_pauses($1,$2,$3,$4)',[id,end,'manual',JSON.stringify(pauses)])).rows[0]
 expect(duration(result)).toBe(50)
 expect((await sql.query<{pause_intervals:typeof pauses}>('select * from public.finish_walk_with_pauses($1,$2,$3,$4)',[id,end,'manual',JSON.stringify(pauses)])).rows[0].pause_intervals).toEqual(pauses)
 await expect(sql.query('select public.finish_walk_with_pauses($1,$2,$3,$4)',[id,end,'manual','[]'])).rejects.toThrow('conflict')
})

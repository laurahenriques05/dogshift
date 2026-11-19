import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {afterAll,beforeAll,it,expect} from 'vitest'
import {dailySlots} from '../features/walks/dailyWalks'
import type {Walk} from '../lib/supabase/database.types'
const sql=new PGlite(),a='80000000-0000-0000-0000-000000000001',b='80000000-0000-0000-0000-000000000002',c='80000000-0000-0000-0000-000000000003'
let dog:string,walk:string,day:string
async function asUser(id:string){await sql.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`)}
beforeAll(async()=>{
 await sql.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`)
 for(const name of ['202611070001_initial_schema.sql','202611110001_walks.sql','20261116170000_walk_dog_waste.sql','20261118200000_walk_pause_and_notes.sql','20261118223000_walk_paused_duration.sql','20261119001000_walk_journal_and_daily_plan.sql','20261119165100_walk_routine_preferences.sql','20261119191348_walk_timeline_corrections.sql'])await sql.exec(readFileSync(`supabase/migrations/${name}`,'utf8'))
 await sql.exec(`insert into auth.users(id) values('${a}'),('${b}'),('${c}')`);await asUser(a)
 const home=(await sql.query<{id:string}>("select public.create_household('Walk journal','Pacific/Kiritimati') id")).rows[0].id
 dog=(await sql.query<{id:string}>("insert into public.dogs(household_id,name) values($1,'Milo') returning id",[home])).rows[0].id
 await sql.exec(`reset role;insert into public.household_members(household_id,user_id,role) values('${home}','${b}','member')`);await asUser(a)
 walk=(await sql.query<{id:string}>('select id from public.start_walk($1)',[dog])).rows[0].id
 day=(await sql.query<{local_day:string}>("select (clock_timestamp() at time zone 'Pacific/Kiritimati')::date::text as local_day")).rows[0].local_day
},30000)
afterAll(()=>sql.close())
it('appends separate notes, rejects conflicting retries and enforces author writes and private active notes',async()=>{
 const id='81000000-0000-0000-0000-000000000001',at=(await sql.query<{at:string}>('select clock_timestamp()::text at')).rows[0].at
 for(let i=0;i<2;i++)await sql.query('select public.append_walk_note($1,$2,$3,$4)',[id,walk,'Shaded path',at])
 expect((await sql.query('select * from public.walk_note_entries')).rows).toHaveLength(1)
 await expect(sql.query('select public.append_walk_note($1,$2,$3,$4)',[id,walk,'overwrite',at])).rejects.toThrow('conflict')
 for(const user of [b,c]){await asUser(user);expect((await sql.query('select * from public.walk_note_entries')).rows).toHaveLength(0);await expect(sql.query('select public.append_walk_note($1,$2,$3,clock_timestamp())',[id,walk,'no'])).rejects.toThrow('access')}
 await asUser(a);await sql.query('select public.append_walk_note($1,$2,$3,clock_timestamp())',['81000000-0000-0000-0000-000000000002',walk,'Water break'])
 await sql.query('select public.finish_walk($1,clock_timestamp(),$2)',[walk,'manual'])
 await asUser(b);expect((await sql.query('select * from public.walk_note_entries')).rows).toHaveLength(2)
 await expect(sql.query("insert into public.walk_note_entries values(gen_random_uuid(),$1,$2,'no',clock_timestamp())",[walk,b])).rejects.toThrow()
})
it('shares the daily count, deduplicates manual completion and permits undo only by its author',async()=>{
 await asUser(b);await sql.query('select public.set_walk_daily_plan($1,3)',[dog])
 await expect(sql.query('select public.set_walk_daily_plan($1,0)',[dog])).rejects.toThrow('between')
 const id='82000000-0000-0000-0000-000000000001'
 for(let i=0;i<2;i++)await sql.query('select public.record_walk_daily_check($1,$2,$3,1)',[id,dog,day])
 await asUser(a);await sql.query('select public.record_walk_daily_check($1,$2,$3,1)',['82000000-0000-0000-0000-000000000002',dog,day])
 expect((await sql.query('select * from public.walk_daily_checks where deleted_at is null')).rows).toHaveLength(1)
 await expect(sql.query('select public.undo_walk_daily_check($1)',[id])).rejects.toThrow('Author')
 await expect(sql.query('select public.record_walk_daily_check($1,$2,$3,4)',['82000000-0000-0000-0000-000000000003',dog,day])).rejects.toThrow('Invalid')
 await expect(sql.query("select public.record_walk_daily_check($1,$2,'2000-01-01',2)",['82000000-0000-0000-0000-000000000003',dog])).rejects.toThrow('Invalid')
 await asUser(c);expect((await sql.query('select * from public.walk_daily_plans')).rows).toHaveLength(0);await expect(sql.query('select public.set_walk_daily_plan($1,2)',[dog])).rejects.toThrow('access')
 await asUser(b);await sql.query('select public.undo_walk_daily_check($1)',[id]);expect((await sql.query('select * from public.walk_daily_checks where deleted_at is null')).rows).toHaveLength(0)
})
it('counts only completed nondeleted real walks in the household day and keeps manual checks separate',()=>{
 const make=(id:string,end:string|null,deleted_at:string|null=null)=>({id,ended_at:end,deleted_at} as Walk)
 const walks=[make('done','2026-01-01T12:05:00Z'),make('yesterday','2025-12-31T08:00:00Z'),make('active',null),make('deleted','2026-01-01T12:00:00Z','2026-01-01T13:00:00Z')]
 const slots=dailySlots(3,walks,[], '2026-01-02','Pacific/Kiritimati')
 expect(slots.filter(s=>s.walk)).toHaveLength(1);expect(slots[0].walk?.id).toBe('done');expect(slots[1].walk).toBeUndefined()
})

it('persists optional routine times and explicit opt-out, protects access and preserves legacy saves',async()=>{
 await asUser(a)
 await sql.query("select public.set_walk_routine($1,3,array['08:30','','21:00'])",[dog])
 expect((await sql.query('select routine_enabled,estimated_times from public.walk_daily_plans')).rows[0]).toEqual({routine_enabled:true,estimated_times:['08:30','','21:00']})
 for(const query of ["select public.set_walk_routine($1,0,'{}')","select public.set_walk_routine($1,1,array['24:00'])","select public.set_walk_routine($1,1,array['08:30','09:30'])","select public.set_walk_routine($1,null,array['08:30'])","select public.set_walk_routine($1,1,array[null]::text[])"]){await expect(sql.query(query,[dog])).rejects.toThrow()}
 await sql.query("select public.set_walk_routine($1,null,'{}')",[dog])
 expect((await sql.query('select routine_enabled from public.walk_daily_plans')).rows[0]).toEqual({routine_enabled:false})
 await asUser(c)
 await expect(sql.query("select public.set_walk_routine($1,2,'{}')",[dog])).rejects.toThrow('access')
 expect((await sql.query('select * from public.walk_daily_plans')).rows).toHaveLength(0)
 await asUser(b);await sql.query('select public.set_walk_daily_plan($1,2)',[dog])
 expect((await sql.query('select routine_enabled,required_count,estimated_times from public.walk_daily_plans')).rows[0]).toEqual({routine_enabled:true,required_count:2,estimated_times:[]})
 await sql.exec('reset role;set role anon')
 await expect(sql.query("select public.set_walk_routine($1,2,'{}')",[dog])).rejects.toThrow()
 await asUser(a)
})

it('atomically corrects saved events and notes, preserves raw GPS, rejects stale and unauthorised edits',async()=>{
 await asUser(a)
 const home=(await sql.query<{household_id:string}>('select household_id from public.dogs where id=$1',[dog])).rows[0].household_id
 const w='83000000-0000-0000-0000-000000000001',n='83000000-0000-0000-0000-000000000002'
 await sql.exec(`reset role;insert into public.walks(id,household_id,dog_id,walker_id,started_at,ended_at,end_reason) values('${w}','${home}','${dog}','${a}','2026-11-18T10:00Z','2026-11-18T10:10Z','manual');insert into public.walk_points(walk_id,seq,recorded_at,latitude,longitude,accuracy) values('${w}',0,'2026-11-18T10:01Z',38,-9,5);insert into public.walk_note_entries values('${n}','${w}','${a}','Water break','2026-11-18T10:02Z')`)
 const expected=[{id:n,text:'Water break',recorded_at:'2026-11-18T10:02:00Z'}],notes=[{...expected[0],text:'Rest and water',recorded_at:'2026-11-18T10:03:00Z'}],events=[{id:'gps-start',at:'2026-11-18T10:02:00Z',label:'Route recording began'}]
 const args=[w,0,'2026-11-18T10:00Z','2026-11-18T10:10Z','',JSON.stringify(expected),JSON.stringify(notes),JSON.stringify(events)]
 const call='select * from public.correct_walk_details($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb)'
 for(const user of [b,c]){await asUser(user);await expect(sql.query(call,args)).rejects.toThrow('author access')}
 await asUser(a)
 await expect(sql.query(call,[...args.slice(0,7),JSON.stringify([{...events[0],at:'2026-11-18T11:00Z'}])])).rejects.toThrow('Invalid timeline')
 expect((await sql.query('select text from public.walk_note_entries where id=$1',[n])).rows[0]).toEqual({text:'Water break'})
 const result=await sql.query<{edit_revision:number;timeline_edits:unknown}>(call,args)
 expect(result.rows[0].timeline_edits).toEqual(events)
 expect((await sql.query('select text from public.walk_note_entries where id=$1',[n])).rows[0]).toEqual({text:'Rest and water'})
 expect((await sql.query('select latitude,longitude,recorded_at::text from public.walk_points where walk_id=$1',[w])).rows[0]).toMatchObject({latitude:38,longitude:-9,recorded_at:'2026-11-18 10:01:00+00'})
 await expect(sql.query(call,args)).rejects.toThrow('Walk changed')
 const revision=result.rows[0].edit_revision
 await expect(sql.query(call,[w,revision,...args.slice(2)])).rejects.toThrow('Notes changed')
 await expect(sql.query('select * from private.walk_correction_audit')).rejects.toThrow()
 await sql.exec(`reset role;update public.walks set pause_intervals='[{"start":"2026-11-18T10:04:00Z","end":"2026-11-18T10:05:00Z"}]' where id='${w}';insert into public.walk_waste_settings values('${w}','during');insert into public.walk_waste_events values('83000000-0000-0000-0000-000000000003','${w}','pee','2026-11-18T10:06:00Z')`)
 await asUser(a)
 const current=(await sql.query<{edit_revision:number}>('select edit_revision from public.walks where id=$1',[w])).rows[0].edit_revision
 const corrections=[...events,{id:'pause-start-0',at:'2026-11-18T10:05:00Z',label:'Rest'},{id:'pause-end-0',at:'2026-11-18T10:07:00Z',label:'Walking again'},{id:'waste-83000000-0000-0000-0000-000000000003',at:'2026-11-18T10:08:00Z',label:'Pee at garden'}]
 const pauseArgs=[w,current,...args.slice(2,5),JSON.stringify(notes),JSON.stringify(notes),JSON.stringify(corrections)]
 await expect(sql.query(call,[...pauseArgs.slice(0,7),JSON.stringify(corrections.map(e=>e.id==='pause-start-0'?{...e,at:'2026-11-18T10:00:00Z'}:e))])).rejects.toThrow('overlap')
 await sql.query(call,pauseArgs)
 expect((await sql.query("select extract(epoch from ((pause_intervals->0->>'end')::timestamptz-(pause_intervals->0->>'start')::timestamptz))::integer seconds from public.walks where id=$1",[w])).rows[0]).toEqual({seconds:120})
 expect((await sql.query("select extract(minute from recorded_at)::integer minute_value from public.walk_waste_events where walk_id=$1",[w])).rows[0]).toEqual({minute_value:8})
 await sql.exec('reset role')
 expect((await sql.query('select * from private.walk_correction_audit where walk_id=$1',[w])).rows).toHaveLength(2)
 await sql.exec('set role anon')
 await expect(sql.query(call,args)).rejects.toThrow()
 await asUser(a)
})

it('upgrades routine times without fabricating existing schedules and requires complete member-owned input',async()=>{
 await sql.exec('reset role')
 const before=(await sql.query('select required_count,estimated_times from public.walk_daily_plans where dog_id=$1',[dog])).rows[0]
 await sql.exec(readFileSync('supabase/migrations/20261119195302_walk_routine_schedule.sql','utf8'))
 expect((await sql.query('select required_count,estimated_times from public.walk_daily_plans where dog_id=$1',[dog])).rows[0]).toEqual(before)
 await asUser(b)
 const call='select public.set_walk_routine_schedule($1,$2::text[],$3::double precision,$4::double precision,$5::text)',args=[dog,['11:30','09:30','20:30'],38.72,-9.14,'Lisbon']
 await sql.query(call,args)
 expect((await sql.query('select estimated_times,place_label from public.walk_daily_plans where dog_id=$1',[dog])).rows[0]).toEqual({estimated_times:['09:30','11:30','20:30'],place_label:'Lisbon'})
 for(const invalid of [[dog,['09:30',''],38,-9,'Lisbon'],[dog,[],38,-9,'Lisbon'],[dog,['24:00'],38,-9,'Lisbon'],[dog,['09:30'],null,-9,'Lisbon'],[dog,['09:30'],91,-9,'Lisbon'],[dog,['09:30'],38,-181,'Lisbon'],[dog,['09:30'],38,-9,' '],[dog,[null],38,-9,'Lisbon']])await expect(sql.query(call,invalid)).rejects.toThrow()
 await expect(sql.query('select public.set_walk_daily_plan($1,2)',[dog])).rejects.toThrow('estimated time')
 await sql.query("select public.set_walk_routine($1,null,'{}')",[dog])
 expect((await sql.query('select routine_enabled from public.walk_daily_plans where dog_id=$1',[dog])).rows[0]).toEqual({routine_enabled:false})
 await sql.query(call,args)
 await asUser(c)
 await expect(sql.query(call,args)).rejects.toThrow('access')
 expect((await sql.query('select * from public.walk_daily_plans where dog_id=$1',[dog])).rows).toHaveLength(0)
 await sql.exec('reset role;set role anon')
 await expect(sql.query(call,args)).rejects.toThrow()
 await asUser(a)
})

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
 for(const name of ['202611070001_initial_schema.sql','202611110001_walks.sql','20261119001000_walk_journal_and_daily_plan.sql'])await sql.exec(readFileSync(`supabase/migrations/${name}`,'utf8'))
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

import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { wasteCounts } from '../features/walks/waste'
const sql = new PGlite()
const a='20000000-0000-0000-0000-000000000001', b='20000000-0000-0000-0000-000000000002', c='20000000-0000-0000-0000-000000000003'
const event='30000000-0000-0000-0000-000000000001'
let dog:string, walk:string
async function asUser(id:string){await sql.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`)}
beforeAll(async()=>{
 await sql.exec(`create role anon nologin;create role authenticated nologin;create schema auth;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`)
 for(const name of ['202611070001_initial_schema.sql','202611110001_walks.sql','20261116170000_walk_dog_waste.sql','20261116190000_walk_tracking_choice.sql','20261117130000_deleted_walk_owner_preview.sql'])await sql.exec(readFileSync(`supabase/migrations/${name}`,'utf8'))
 await sql.exec(`insert into auth.users(id) values('${a}'),('${b}'),('${c}')`);await asUser(a)
 const home=(await sql.query<{id:string}>("select public.create_household('Waste test','Europe/Lisbon') id")).rows[0].id
 dog=(await sql.query<{id:string}>("insert into public.dogs(household_id,name) values($1,'Milo') returning id",[home])).rows[0].id
 await sql.exec(`reset role;insert into public.household_members(household_id,user_id,role) values('${home}','${b}','member')`);await asUser(a)
},30000)
afterAll(()=>sql.close())
describe('dog waste permissions and retries (local database)',()=>{
 it('rejects invalid choices without starting a walk and saves the choice atomically',async()=>{
  await expect(sql.query('select public.start_walk_with_waste($1,$2)',[dog,'invalid'])).rejects.toThrow('valid')
  expect((await sql.query('select * from public.walks')).rows).toHaveLength(0)
  walk=(await sql.query<{id:string}>("select id from public.start_walk_with_waste($1,'during')",[dog])).rows[0].id
  expect((await sql.query<{id:string}>("select id from public.start_walk_with_waste($1,'end')",[dog])).rows[0].id).toBe(walk)
  expect((await sql.query<{record_mode:string}>('select * from public.walk_waste_settings')).rows[0].record_mode).toBe('during')
 })
 it('records pee and poop, retries once and rejects changed duplicate IDs',async()=>{
  for(let i=0;i<2;i++)await sql.query("select public.record_walk_waste($1,$2,'pee')",[event,walk])
  expect((await sql.query('select * from public.walk_waste_events')).rows).toHaveLength(1)
  await expect(sql.query("select public.record_walk_waste($1,$2,'poop')",[event,walk])).rejects.toThrow('conflict')
  await expect(sql.query("select public.record_walk_waste(gen_random_uuid(),$1,'other')",[walk])).rejects.toThrow('pee or poop')
  await sql.query("select public.record_walk_waste(gen_random_uuid(),$1,'poop')",[walk])
 })
 it('keeps active records private and rejects writes by a household member or outsider',async()=>{
  for(const id of [b,c]){
   await asUser(id)
   expect((await sql.query('select * from public.walk_waste_events')).rows).toHaveLength(0)
   expect((await sql.query('select * from public.walk_waste_settings')).rows).toHaveLength(0)
   await expect(sql.query("select public.record_walk_waste(gen_random_uuid(),$1,'pee')",[walk])).rejects.toThrow('access required')
  }
  await asUser(a)
  await expect(sql.query("insert into public.walk_waste_events(id,walk_id,kind) values(gen_random_uuid(),$1,'pee')",[walk])).rejects.toThrow('permission denied')
 })
 it('shares the completed summary with members and permits final recording by the walker',async()=>{
  await sql.query("select public.finish_walk($1,clock_timestamp(),'manual')",[walk]);await asUser(b)
  expect((await sql.query('select * from public.walk_waste_events')).rows).toHaveLength(2)
  await asUser(c);expect((await sql.query('select * from public.walk_waste_events')).rows).toHaveLength(0)
  await asUser(a)
  const finalWalk=(await sql.query<{id:string}>("select id from public.start_walk_with_waste($1,'end')",[dog])).rows[0].id
  await sql.query("select public.finish_walk($1,clock_timestamp(),'manual')",[finalWalk])
  await sql.query("select public.record_walk_waste(gen_random_uuid(),$1,'pee')",[finalWalk])
  const off=(await sql.query<{id:string}>("select id from public.start_walk_with_waste($1,'off')",[dog])).rows[0].id
  await expect(sql.query("select public.record_walk_waste(gen_random_uuid(),$1,'pee')",[off])).rejects.toThrow('not enabled')
  await sql.query("select public.set_walk_deleted($1,true)",[finalWalk])
  await expect(sql.query("select public.record_walk_waste(gen_random_uuid(),$1,'pee')",[finalWalk])).rejects.toThrow('access required')
  await sql.query("select public.set_walk_deleted($1,false)",[finalWalk])
  expect((await sql.query('select * from public.walk_waste_events where walk_id=$1',[finalWalk])).rows).toHaveLength(1)
  await asUser(b)
  expect((await sql.query('select * from public.walk_waste_events where walk_id=$1',[finalWalk])).rows).toHaveLength(1)
  await asUser(a)
 })
 it('persists time-only mode, preserves it on retry and rejects GPS samples in SQL', async()=>{
  const active=(await sql.query<{id:string}>('select id from public.walks where ended_at is null')).rows[0]
  if(active)await sql.query("select public.finish_walk($1,clock_timestamp(),'manual')",[active.id])
  const id=(await sql.query<{id:string}>("select id from public.start_walk_with_options($1,'end',false)",[dog])).rows[0].id
  await sql.query("select public.start_walk_with_options($1,'during',true)",[dog])
  expect((await sql.query<{track_gps:boolean}>('select track_gps from public.walk_waste_settings where walk_id=$1',[id])).rows[0].track_gps).toBe(false)
  await expect(sql.query(`select public.append_walk_points($1,jsonb_build_array(jsonb_build_object('seq',0,'recorded_at',clock_timestamp(),'latitude',38,'longitude',-9,'accuracy',5)))`,[id])).rejects.toThrow('GPS tracking is disabled')
  await sql.query("select public.finish_walk($1,clock_timestamp(),'manual')",[id])
  await sql.query("select public.record_walk_waste(gen_random_uuid(),$1,'pee')",[id])
  expect((await sql.query('select * from public.walk_points where walk_id=$1',[id])).rows).toHaveLength(0)
  expect((await sql.query('select * from public.walk_waste_events where walk_id=$1',[id])).rows).toHaveLength(1)
 })
 it('keeps deleted GPS routes and waste readable only to the owner and restores both', async()=>{
  const id=(await sql.query<{id:string}>("select id from public.start_walk_with_options($1,'during',true)",[dog])).rows[0].id
  await sql.query(`select public.append_walk_points($1,jsonb_build_array(jsonb_build_object('seq',0,'recorded_at',clock_timestamp(),'latitude',38,'longitude',-9,'accuracy',5)))`,[id])
  await sql.query("select public.record_walk_waste(gen_random_uuid(),$1,'pee')",[id])
  await sql.query("select public.finish_walk($1,clock_timestamp(),'manual')",[id])
  await sql.query('select public.set_walk_deleted($1,true)',[id])
  expect((await sql.query('select * from public.walk_points where walk_id=$1',[id])).rows).toHaveLength(1)
  expect((await sql.query('select * from public.walk_waste_events where walk_id=$1',[id])).rows).toHaveLength(1)
  for (const user of [b,c]) {
   await asUser(user)
   expect((await sql.query('select * from public.walk_points where walk_id=$1',[id])).rows).toHaveLength(0)
   expect((await sql.query('select * from public.walk_waste_events where walk_id=$1',[id])).rows).toHaveLength(0)
   await expect(sql.query('select public.set_walk_deleted($1,false)',[id])).rejects.toThrow('Walker access')
  }
  await asUser(a);await sql.query('select public.set_walk_deleted($1,false)',[id]);await asUser(b)
  expect((await sql.query('select * from public.walk_points where walk_id=$1',[id])).rows).toHaveLength(1)
  expect((await sql.query('select * from public.walk_waste_events where walk_id=$1',[id])).rows).toHaveLength(1)
  await asUser(a)
 })
 it('counts unique entries without interpreting an empty list as a confirmed negative',()=>{
  expect(wasteCounts([{id:'a',kind:'pee'},{id:'a',kind:'pee'},{id:'b',kind:'poop'}])).toEqual({pee:1,poop:1})
  expect(wasteCounts([])).toEqual({pee:0,poop:0})
 })
})

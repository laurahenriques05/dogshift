import { afterAll, beforeAll, expect, it } from 'vitest'
import { taskFixture, owner, member, outsider } from './helpers/taskFixture'
let f:Awaited<ReturnType<typeof taskFixture>>,dog:string
beforeAll(async()=>{
 f=await taskFixture()
 dog=(await f.sql.query<{id:string}>("insert into public.dogs(household_id,name) values($1,'Milo') returning id",[f.home])).rows[0].id
},60000)
afterAll(async()=>{await f?.sql.close()})
it('lets current members permanently remove completed deleted family walks, with private-record cascades and task cleanup',async()=>{
 const series=(await f.sql.query<{id:string}>("select public.save_care_task($1,'walk','Walk',null,$2,clock_timestamp()-interval '1 minute','none',1,null) id",[f.home,owner])).rows[0].id
 const occurrence=(await f.sql.query<{id:string}>('select id from public.task_occurrences where series_id=$1',[series])).rows[0].id
 const walk=(await f.sql.query<{id:string}>("select id from public.start_task_walk($1,$2,'during',true)",[occurrence,dog])).rows[0].id
 await expect(f.sql.query('select public.permanently_delete_walk($1)',[walk])).rejects.toThrow('Finish the walk')
 await f.sql.exec('reset role')
 await f.sql.query("insert into public.walk_points(walk_id,seq,recorded_at,latitude,longitude,accuracy) values($1,0,clock_timestamp(),38,-9,5)",[walk])
 await f.user(owner)
 await f.sql.query("select public.record_walk_waste(gen_random_uuid(),$1,'pee')",[walk])
 await f.sql.query("select public.append_walk_note(gen_random_uuid(),$1,'A note',clock_timestamp())",[walk])
 await f.sql.query('select public.finish_walk($1,clock_timestamp())',[walk])
 await f.user(member);await f.sql.query('select public.set_walk_deleted($1,true)',[walk])
 const listed=await f.sql.query<Record<string,unknown>>('select * from public.get_deleted_walk_history($1)',[f.home])
 expect(listed.rows.map(row=>row.id)).toContain(walk)
 expect(listed.rows[0]).not.toHaveProperty('notes')
 expect(listed.rows[0]).not.toHaveProperty('points')
 for(const table of ['walk_points','walk_note_entries','walk_waste_events'])expect((await f.sql.query(`select * from public.${table} where walk_id=$1`,[walk])).rows).toHaveLength(0)
 await expect(f.sql.query('select public.set_walk_deleted($1,false)',[walk])).rejects.toThrow('Walker access')
 for(const id of [outsider,'']){
  await f.user(id);await expect(f.sql.query('select public.permanently_delete_walk($1)',[walk])).rejects.toThrow('Household member')
  await expect(f.sql.query('select * from public.get_deleted_walk_history($1)',[f.home])).rejects.toThrow('Household member')
 }
 await f.sql.exec('reset role;set role anon')
 await expect(f.sql.query('select public.permanently_delete_walk($1)',[walk])).rejects.toThrow('permission denied')
 await f.sql.exec('reset role');await f.sql.query('delete from public.household_members where user_id=$1',[owner]);await f.user(owner)
 await expect(f.sql.query('select public.permanently_delete_walk($1)',[walk])).rejects.toThrow('Household member')
 await f.sql.exec('reset role');await f.sql.query("insert into public.household_members(household_id,user_id,role) values($1,$2,'owner')",[f.home,owner]);await f.user(owner)
 await f.user(member)
 await f.sql.query('select public.permanently_delete_walk($1)',[walk])
 await expect(f.sql.query('select public.set_walk_deleted($1,false)',[walk])).rejects.toThrow('Household member')
 expect((await f.sql.query('select walk_id,completed_at,completed_by from public.task_occurrences where id=$1',[occurrence])).rows[0]).toEqual({walk_id:null,completed_at:null,completed_by:null})
 await f.sql.exec('reset role')
 for(const table of ['walks','walk_points','walk_waste_settings','walk_waste_events','walk_note_entries']){
  expect((await f.sql.query(`select * from public.${table} where ${table==='walks'?'id':'walk_id'}=$1`,[walk])).rows).toHaveLength(0)
 }
})

it('allows direct permanent removal of another member’s completed walk, but never an active walk or a former member',async()=>{
 await f.user(owner)
 const walk=(await f.sql.query<{id:string}>("select id from public.start_walk_with_options($1,'off',false)",[dog])).rows[0].id
 await f.user(member)
 await expect(f.sql.query('select public.permanently_delete_walk($1)',[walk])).rejects.toThrow('Finish the walk')
 await f.user(owner);await f.sql.query('select public.finish_walk($1,clock_timestamp())',[walk])
 await f.sql.exec('reset role');await f.sql.query('delete from public.household_members where user_id=$1',[member]);await f.user(member)
 await expect(f.sql.query('select public.permanently_delete_walk($1)',[walk])).rejects.toThrow('Household member')
 await f.sql.exec('reset role');await f.sql.query("insert into public.household_members(household_id,user_id,role) values($1,$2,'member')",[f.home,member]);await f.user(member)
 await expect(f.sql.query('delete from public.walks where id=$1',[walk])).rejects.toThrow('permission denied')
 await f.sql.query('select public.permanently_delete_walk($1)',[walk])
 await f.sql.exec('reset role')
 expect((await f.sql.query('select id from public.walks where id=$1',[walk])).rows).toHaveLength(0)
})

it('installs the final hosted rollout without either earlier deletion proposal',async()=>{
 const {PGlite}=await import('@electric-sql/pglite'),{readFileSync}=await import('node:fs')
 const sql=new PGlite()
 try{
  await sql.exec(`create role anon;create role authenticated;create schema auth;
   create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`)
  for(const name of ['202611070001_initial_schema.sql','202611110001_walks.sql','20261118223000_walk_paused_duration.sql','20261121102419_family_walk_removal.sql'])await sql.exec(readFileSync(`supabase/migrations/${name}`,'utf8'))
  await sql.exec(`insert into auth.users(id) values('${owner}'),('${member}');set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false)`)
  const home=(await sql.query<{id:string}>("select public.create_household('Rollout','UTC') id")).rows[0].id
  const dog=(await sql.query<{id:string}>("insert into public.dogs(household_id,name) values($1,'Milo') returning id",[home])).rows[0].id
  await sql.exec('reset role');await sql.query("insert into public.household_members(household_id,user_id,role) values($1,$2,'member')",[home,member])
  await sql.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false)`)
  const walk=(await sql.query<{id:string}>('select id from public.start_walk($1)',[dog])).rows[0].id
  await sql.query('select public.finish_walk($1,clock_timestamp())',[walk])
  await sql.exec(`select set_config('request.jwt.claim.sub','${member}',false)`)
  await sql.query('select public.set_walk_deleted($1,true)',[walk])
  expect((await sql.query('select * from public.get_deleted_walk_history($1)',[home])).rows).toHaveLength(1)
  await sql.query('select public.permanently_delete_walk($1)',[walk])
  expect((await sql.query('select * from public.get_deleted_walk_history($1)',[home])).rows).toHaveLength(0)
 }finally{await sql.close()}
})

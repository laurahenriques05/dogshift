import { afterAll, beforeAll, expect, it } from 'vitest'
import { taskFixture, owner, member, outsider } from './helpers/taskFixture'
let f:Awaited<ReturnType<typeof taskFixture>>,dog:string
beforeAll(async()=>{
 f=await taskFixture()
 dog=(await f.sql.query<{id:string}>("insert into public.dogs(household_id,name) values($1,'Milo') returning id",[f.home])).rows[0].id
},60000)
afterAll(async()=>{await f?.sql.close()})
it('permanently deletes only an author’s deleted completed walk, cascades private records and clears the task source',async()=>{
 const series=(await f.sql.query<{id:string}>("select public.save_care_task($1,'walk','Walk',null,$2,clock_timestamp()-interval '1 minute','none',1,null) id",[f.home,owner])).rows[0].id
 const occurrence=(await f.sql.query<{id:string}>('select id from public.task_occurrences where series_id=$1',[series])).rows[0].id
 const walk=(await f.sql.query<{id:string}>("select id from public.start_task_walk($1,$2,'during',true)",[occurrence,dog])).rows[0].id
 await expect(f.sql.query('select public.permanently_delete_walk($1)',[walk])).rejects.toThrow('Only completed, deleted')
 await f.sql.exec('reset role')
 await f.sql.query("insert into public.walk_points(walk_id,seq,recorded_at,latitude,longitude,accuracy) values($1,0,clock_timestamp(),38,-9,5)",[walk])
 await f.user(owner)
 await f.sql.query("select public.record_walk_waste(gen_random_uuid(),$1,'pee')",[walk])
 await f.sql.query("select public.append_walk_note(gen_random_uuid(),$1,'A note',clock_timestamp())",[walk])
 await f.sql.query('select public.finish_walk($1,clock_timestamp())',[walk])
 await expect(f.sql.query('select public.permanently_delete_walk($1)',[walk])).rejects.toThrow('Only completed, deleted')
 await f.user(member);await f.sql.query('select public.set_walk_deleted($1,true)',[walk])
 for(const id of [member,outsider,'']){
  await f.user(id);await expect(f.sql.query('select public.permanently_delete_walk($1)',[walk])).rejects.toThrow('Walker access')
 }
 await f.sql.exec('reset role;set role anon')
 await expect(f.sql.query('select public.permanently_delete_walk($1)',[walk])).rejects.toThrow('permission denied')
 await f.sql.exec('reset role');await f.sql.query('delete from public.household_members where user_id=$1',[owner]);await f.user(owner)
 await expect(f.sql.query('select public.permanently_delete_walk($1)',[walk])).rejects.toThrow('Walker access')
 await f.sql.exec('reset role');await f.sql.query("insert into public.household_members(household_id,user_id,role) values($1,$2,'owner')",[f.home,owner]);await f.user(owner)
 await f.sql.query('select public.permanently_delete_walk($1)',[walk])
 await expect(f.sql.query('select public.set_walk_deleted($1,false)',[walk])).rejects.toThrow('Household member')
 expect((await f.sql.query('select walk_id,completed_at,completed_by from public.task_occurrences where id=$1',[occurrence])).rows[0]).toEqual({walk_id:null,completed_at:null,completed_by:null})
 await f.sql.exec('reset role')
 for(const table of ['walks','walk_points','walk_waste_settings','walk_waste_events','walk_note_entries']){
  expect((await f.sql.query(`select * from public.${table} where ${table==='walks'?'id':'walk_id'}=$1`,[walk])).rows).toHaveLength(0)
 }
})

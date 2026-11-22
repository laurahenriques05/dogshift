import { afterAll,beforeAll,expect,it } from 'vitest'
import { taskFixture,owner,member } from './helpers/taskFixture'
let f:Awaited<ReturnType<typeof taskFixture>>,dog:string
beforeAll(async()=>{f=await taskFixture();dog=(await f.sql.query<{id:string}>("insert into public.dogs(household_id,name) values($1,'Milo') returning id",[f.home])).rows[0].id},60000)
afterAll(async()=>{await f?.sql.close()})
it('purges all expired completed walks, cascades routes/notes and preserves real task completion',async()=>{
 const series=(await f.sql.query<{id:string}>("select public.save_care_task($1,'walk','Walk',null,$2,clock_timestamp(),'none',1,null) id",[f.home,owner])).rows[0].id
 const occurrence=(await f.sql.query<{id:string}>('select id from public.task_occurrences where series_id=$1',[series])).rows[0].id
 const linked=(await f.sql.query<{id:string}>("select id from public.start_task_walk($1,$2,'during',true)",[occurrence,dog])).rows[0].id
 await f.sql.query("select public.record_walk_waste(gen_random_uuid(),$1,'pee')",[linked])
 await f.sql.query('select public.finish_walk($1,clock_timestamp())',[linked])
 await f.sql.exec('reset role')
 await f.sql.query("update public.walks set started_at=now()-interval '9 days',ended_at=now()-interval '8 days' where id=$1",[linked])
 await f.sql.query("insert into public.walk_points(walk_id,seq,recorded_at,latitude,longitude,accuracy) values($1,0,now()-interval '9 days',38,-9,5)",[linked])
 await f.sql.query("insert into public.walk_note_entries(id,walk_id,author_id,text,recorded_at) values(gen_random_uuid(),$1,$2,'Old note',now())",[linked,owner])
 const proof=(await f.sql.query<Record<string,unknown>>('select completed_at,completed_by from public.task_occurrences where id=$1',[occurrence])).rows[0]
 const insert=async(ended:string|null,deleted=false)=> (await f.sql.query<{id:string}>("insert into public.walks(household_id,dog_id,walker_id,started_at,ended_at,end_reason,deleted_at) values($1,$2,$3,now()-interval '10 days',"+(ended?`now()-interval '${ended}'`: 'null')+","+(ended?"'manual'":"null")+","+(deleted?'now()':'null')+") returning id",[f.home,dog,member])).rows[0].id
 const oldDeleted=await insert('8 days',true),recent=await insert('6 days'),active=await insert(null)
 await f.user(member);await expect(f.sql.exec('select private.purge_expired_walks()')).rejects.toThrow('permission denied')
 await f.sql.exec('reset role;set role anon');await expect(f.sql.exec('select private.purge_expired_walks()')).rejects.toThrow('permission denied')
 await f.sql.exec('reset role')
 expect((await f.sql.query<{n:number}>('select private.purge_expired_walks() n')).rows[0].n).toBe(2)
 expect((await f.sql.query<{id:string}>('select id from public.walks order by id')).rows.map(r=>r.id).sort()).toEqual([recent,active].sort())
 for(const table of ['walk_points','walk_note_entries','walk_waste_events','walk_waste_settings'])expect((await f.sql.query(`select * from public.${table} where walk_id=$1`,[linked])).rows).toHaveLength(0)
 const task=(await f.sql.query<Record<string,unknown>>('select walk_id,completed_at,completed_by from public.task_occurrences where id=$1',[occurrence])).rows[0]
 expect(task).toEqual({walk_id:null,...proof})
 expect((await f.sql.query<{n:number}>('select private.purge_expired_walks() n')).rows[0].n).toBe(0)
 await f.user(owner);await expect(f.sql.exec('select * from private.walk_retention_receipts')).rejects.toThrow('permission denied')
 expect(oldDeleted).not.toBe(linked)
})

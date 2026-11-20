import { afterAll,beforeAll,expect,it } from 'vitest'
import { taskFixture,owner,member,outsider } from './helpers/taskFixture'
import { careHref } from '../features/tasks/care'
import { taskStatus } from '../features/tasks/model'
let f:Awaited<ReturnType<typeof taskFixture>>
let product:string,dog:string
const meal='50000000-0000-0000-0000-000000000001'
beforeAll(async()=>{
 f=await taskFixture()
 product=(await f.sql.query<{id:string}>("select public.save_food_product($1,gen_random_uuid(),'Food','dry',100,200,10000,7) id",[f.home])).rows[0].id
 await f.sql.query('select public.save_feeding_plan($1,$2::jsonb,null)',[f.home,JSON.stringify([{id:meal,name:'Dinner',time:'00:00',items:[{product_id:product,quantity_grams:100}]}])])
 await f.sql.exec('reset role')
 dog=(await f.sql.query<{id:string}>("insert into public.dogs(household_id,name) values($1,'Nova') returning id",[f.home])).rows[0].id
 await f.user(owner)
},60000)
afterAll(async()=>{await f?.sql.close()})
async function create(kind='walk',assigned:string|null=owner,due="clock_timestamp()-interval '1 minute'",repeat='none'){
 await f.user(owner)
 const series=(await f.sql.query<{id:string}>(`select public.save_care_task($1,$2,'Care',$3,$4,${due},$5,1,null) id`,[f.home,kind,kind==='feeding'?meal:null,assigned,repeat])).rows[0].id
 return (await f.sql.query<{id:string}>('select id from public.task_occurrences where series_id=$1 order by due_at',[series])).rows[0].id
}
it('creates an occurrence with its original assignee and no new notifications; rejects false completion',async()=>{
 const id=await create()
 const row=(await f.sql.query<{original_assigned_to:string;completed_at:null;care_kind:string}>('select * from public.task_occurrences where id=$1',[id])).rows[0]
 expect(row).toMatchObject({care_kind:'walk',original_assigned_to:owner,completed_at:null})
 await expect(f.sql.query('select public.complete_household_task($1,true)',[id])).rejects.toThrow('real activity')
 expect((await f.sql.query("select id from public.scheduled_notifications where source_id=$1",[`task:${id}`])).rows).toHaveLength(0)
})
it('takes and swaps one occurrence with version protection, audit and active-family permissions',async()=>{
 const id=await create('walk',null,"clock_timestamp()+interval '1 hour'",'daily')
 const original=(await f.sql.query<{series_id:string}>('select series_id from public.task_occurrences where id=$1',[id])).rows[0]
 await f.user(member)
 await f.sql.query('select public.assign_care_task_occurrence($1,$2,0)',[id,member])
 await expect(f.sql.query('select public.assign_care_task_occurrence($1,$2,0)',[id,owner])).rejects.toThrow('Responsibility changed')
 await expect(f.sql.query('select public.assign_care_task_occurrence($1,$2,1)',[id,outsider])).rejects.toThrow('current family member')
 await f.sql.query('select public.assign_care_task_occurrence($1,$2,1)',[id,owner])
 await expect(f.sql.query('select public.assign_care_task_occurrence($1,$2,0)',[id,member])).rejects.toThrow('Responsibility changed')
 const audit=await f.sql.query<{changed_by:string;version:number}>('select changed_by,version from public.task_assignment_history where occurrence_id=$1 order by version',[id])
 expect(audit.rows).toEqual([{changed_by:member,version:1},{changed_by:member,version:2}])
 expect((await f.sql.query('select id from public.task_occurrences where series_id=$1 and id<>$2 and assigned_to is not null',[original.series_id,id])).rows).toHaveLength(0)
 await expect(f.sql.query('select public.assign_household_task_occurrence($1,$2,$3)',[id,member,owner])).rejects.toThrow('Reload Tasks')
 await f.user(outsider)
 await expect(f.sql.query('select public.assign_care_task_occurrence($1,$2,2)',[id,outsider])).rejects.toThrow('access denied')
 expect((await f.sql.query('select * from public.task_assignment_history')).rows).toHaveLength(0)
})
it('records one real meal atomically, replays safely, and reopens after correction/removal',async()=>{
 const id=await create('feeding')
 const event='60000000-0000-0000-0000-000000000001'
 const items=JSON.stringify([{product_id:product,quantity_grams:100,eaten_grams:100}])
 await expect(f.sql.query("select public.record_task_meal($1,$2,$3::jsonb,clock_timestamp(),'skipped','')",[id,event,items])).rejects.toThrow('stays pending')
 await expect(f.sql.query("select public.record_task_meal($1,$2,'[]'::jsonb,clock_timestamp(),'given','')",[id,event])).rejects.toThrow()
 expect((await f.sql.query('select completed_at from public.task_occurrences where id=$1',[id])).rows[0]).toMatchObject({completed_at:null})
 await f.user(member)
 await f.sql.query("select public.record_task_meal($1,$2,$3::jsonb,clock_timestamp(),'given','')",[id,event,items])
 expect((await f.sql.query('select completed_by,meal_event_id from public.task_occurrences where id=$1',[id])).rows[0]).toEqual({completed_by:member,meal_event_id:event})
 await f.user(owner)
 await f.sql.query("select public.record_task_meal($1,gen_random_uuid(),$2::jsonb,clock_timestamp(),'given','')",[id,items])
 expect((await f.sql.query('select id from public.feeding_meal_events where routine_meal_id=$1',[meal])).rows).toHaveLength(1)
 await expect(f.sql.query('select public.complete_household_task($1,false)',[id])).rejects.toThrow()
 await f.user(member)
 await f.sql.query("select public.save_meal_result($1,$2,'[]'::jsonb,clock_timestamp(),'app',false,$3,'skipped','',false)",[f.home,event,meal])
 expect((await f.sql.query('select completed_at from public.task_occurrences where id=$1',[id])).rows[0]).toMatchObject({completed_at:null})
 await f.sql.query("select public.save_meal_result($1,$2,$3::jsonb,clock_timestamp(),'app',false,$4,'given','',false)",[f.home,event,items,meal])
 expect((await f.sql.query('select completed_by from public.task_occurrences where id=$1',[id])).rows[0]).toMatchObject({completed_by:member})
 await f.sql.query("select public.save_meal_result($1,$2,'[]'::jsonb,clock_timestamp(),'app',false,$3,'given','',true)",[f.home,event,meal])
 expect((await f.sql.query('select completed_at from public.task_occurrences where id=$1',[id])).rows[0]).toMatchObject({completed_at:null})
})
it('starts through real Walks with explicit GPS choice; only finishes on saved end; no double walk',async()=>{
 const id=await create()
 await f.user(member)
 const walk=(await f.sql.query<{id:string}>("select (public.start_task_walk($1,$2,'off',false)).id",[id,dog])).rows[0].id
 expect((await f.sql.query('select completed_at from public.task_occurrences where id=$1',[id])).rows[0]).toMatchObject({completed_at:null})
 const again=(await f.sql.query<{id:string}>("select (public.start_task_walk($1,$2,'off',false)).id",[id,dog])).rows[0].id
 expect(again).toBe(walk)
 expect((await f.sql.query('select track_gps from public.walk_waste_settings where walk_id=$1',[walk])).rows[0]).toMatchObject({track_gps:false})
 await f.user(owner)
 await expect(f.sql.query("select public.start_task_walk($1,$2,'off',false)",[id,dog])).rejects.toThrow('Another member')
 await expect(f.sql.query("select public.finish_walk($1,clock_timestamp(),'manual')",[walk])).rejects.toThrow()
 await f.user(member)
 await f.sql.query("select public.finish_walk($1,clock_timestamp(),'manual')",[walk])
 expect((await f.sql.query('select completed_by from public.task_occurrences where id=$1',[id])).rows[0]).toMatchObject({completed_by:member})
 await f.sql.exec('reset role')
 await f.sql.query('update public.walks set deleted_at=clock_timestamp() where id=$1',[walk])
 expect((await f.sql.query('select completed_at from public.task_occurrences where id=$1',[id])).rows[0]).toMatchObject({completed_at:null})
})
it('preserves older generic tasks and rejects invalid meal / future day / outsider creation',async()=>{
 await f.user(owner)
 const old=await f.task(owner)
 await f.sql.query('select public.complete_household_task($1,true)',[old.occurrence])
 await expect(f.sql.query("select public.save_care_task($1,'feeding','Wrong',gen_random_uuid(),null,clock_timestamp(),'none',1,null)",[f.home])).rejects.toThrow('saved Feeding meal')
 const future=await create('walk',owner,"clock_timestamp()+interval '2 days'")
 await expect(f.sql.query("select public.start_task_walk($1,$2,'off',false)",[future,dog])).rejects.toThrow('future day')
 await f.user(outsider)
 await expect(f.sql.query("select public.save_care_task($1,'walk','Wrong',null,null,clock_timestamp(),'none',1,null)",[f.home])).rejects.toThrow('access denied')
})
it('routes calendar and board actions to the real flow and keeps overdue/unassigned tasks open',()=>{
 expect(careHref({id:'one',care_kind:'feeding',completed_at:null})).toBe('/feed?task=one')
 expect(careHref({id:'two',care_kind:'walk',completed_at:null})).toBe('/walks?action=start&task=two')
 expect(careHref({id:'two',care_kind:'walk',completed_at:'2026-01-01'})).toBe('/tasks?occurrence=two')
 expect(taskStatus({due_at:'2026-01-01',completed_at:null},Date.parse('2026-01-02'))).toBe('overdue')
})

it('matches ordinary Feeding to its task without a second bowl, preserves stock, and rejects overlapping meal tasks',async()=>{
 await f.user(owner)
 const secondMeal='50000000-0000-0000-0000-000000000002'
 await f.sql.query('select public.save_feeding_plan($1,$2::jsonb,null)',[f.home,JSON.stringify([{id:meal,name:'Dinner',time:'00:00',items:[{product_id:product,quantity_grams:100}]},{id:secondMeal,name:'Breakfast',time:'00:01',items:[{product_id:product,quantity_grams:100}]}])])
 const series=(await f.sql.query<{id:string}>("select public.save_care_task($1,'feeding','Breakfast',$2,null,clock_timestamp(),'none',1,null) id",[f.home,secondMeal])).rows[0].id
 const id=(await f.sql.query<{id:string}>('select id from public.task_occurrences where series_id=$1',[series])).rows[0].id
 await expect(f.sql.query("select public.save_care_task($1,'feeding','Duplicate',$2,null,clock_timestamp(),'none',1,null)",[f.home,secondMeal])).rejects.toThrow('already has a task')
 const event='60000000-0000-0000-0000-000000000002'
 const items=JSON.stringify([{product_id:product,quantity_grams:100,eaten_grams:100}])
 await f.sql.query("select public.save_meal_result($1,$2,$3::jsonb,clock_timestamp(),'app',false,$4,'given','',false)",[f.home,event,items,secondMeal])
 expect((await f.sql.query('select completed_by,meal_event_id from public.task_occurrences where id=$1',[id])).rows[0]).toEqual({completed_by:owner,meal_event_id:event})
 await f.sql.query("select public.record_task_meal($1,gen_random_uuid(),$2::jsonb,clock_timestamp(),'given','')",[id,items])
 expect((await f.sql.query('select quantity_grams from public.feeding_entries where event_id=$1 and deleted_at is null',[event])).rows).toHaveLength(1)
 await f.sql.query("select public.save_meal_result($1,$2,$3::jsonb,clock_timestamp()-interval '1 day','app',false,$4,'given','',false)",[f.home,event,items,secondMeal])
 expect((await f.sql.query('select completed_at from public.task_occurrences where id=$1',[id])).rows[0]).toMatchObject({completed_at:null})
})
it('preserves linked active walks when stopping future dates, and releases departing assignees without losing original responsibility',async()=>{
 // Keep a future due time on today's UTC date, including after 23:00.
 const id=await create('walk',member,"clock_timestamp()+(date_trunc('day',clock_timestamp())+interval '1 day'-clock_timestamp())/2")
 await f.user(member)
 const walk=(await f.sql.query<{id:string}>("select (public.start_task_walk($1,$2,'off',false)).id",[id,dog])).rows[0].id
 const series=(await f.sql.query<{series_id:string}>('select series_id from public.task_occurrences where id=$1',[id])).rows[0].series_id
 await f.sql.query('select public.archive_household_task($1,$2)',[f.home,series])
 expect((await f.sql.query('select walk_id from public.task_occurrences where id=$1',[id])).rows[0]).toMatchObject({walk_id:walk})
 await f.sql.query("select public.finish_walk($1,clock_timestamp(),'manual')",[walk])
 const open=await create('walk',member)
 await f.user(member)
 await f.sql.query('select public.leave_household($1,null)',[f.home])
 await f.user(owner)
 expect((await f.sql.query('select assigned_to,original_assigned_to,assignment_version from public.task_occurrences where id=$1',[open])).rows[0]).toEqual({assigned_to:null,original_assigned_to:member,assignment_version:1})
 await expect(f.sql.query('select public.assign_care_task_occurrence($1,$2,1)',[open,member])).rejects.toThrow('current family member')
 await expect(f.sql.query('update public.task_occurrences set completed_at=clock_timestamp() where id=$1',[open])).rejects.toThrow('permission denied')
})

it('replays a quick-create request without duplicating the occurrence and rejects changed retry payloads',async()=>{
 await f.user(owner)
 const request='70000000-0000-0000-0000-000000000001'
 const args=[f.home,owner,request]
 const query="select public.save_care_task($1,'walk','Retry walk',null,$2,'2026-11-20T09:00Z','none',1,null,$3) id"
 const first=(await f.sql.query<{id:string}>(query,args)).rows[0].id
 expect((await f.sql.query<{id:string}>(query,args)).rows[0].id).toBe(first)
 expect((await f.sql.query('select id from public.task_occurrences where series_id=$1',[first])).rows).toHaveLength(1)
 await expect(f.sql.query(query.replace('Retry walk','Changed retry'),args)).rejects.toThrow('already used')
})

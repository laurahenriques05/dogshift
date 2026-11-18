import { expect,it } from 'vitest'
import { groupTasks,type TaskRow } from '../features/tasks/board'
import { taskFixture,owner,member,outsider } from './helpers/taskFixture'
function row(id:string,due_at:string,completed_at:string|null=null){return {id,due_at,completed_at} as TaskRow}
it('puts today first in the household timezone and never mixes completed work with open tasks',()=>{
 const groups=groupTasks([row('today-overdue','2026-06-18T08:00Z'),row('yesterday','2026-06-17T12:00Z'),row('tomorrow','2026-06-19T12:00Z'),row('done','2026-06-18T12:00Z','2026-06-18T12:30Z'),row('local-today','2026-06-17T23:30Z')],'Europe/Lisbon',new Date('2026-06-18T09:00Z'))
 expect(groups.today.map(task=>task.id)).toEqual(['local-today','today-overdue'])
 expect(groups.overdue.map(task=>task.id)).toEqual(['yesterday'])
 expect(groups.upcoming.map(task=>task.id)).toEqual(['tomorrow'])
 expect(groups.completed.map(task=>task.id)).toEqual(['done'])
})
it('assigns only the selected date and rejects stale or cross-household assignments',async()=>{
 const {sql,user,home,task}=await taskFixture()
 try{
  const {series,occurrence}=await task(null)
  await sql.exec('reset role')
  const second=(await sql.query<{id:string}>("insert into public.task_occurrences(household_id,series_id,title,recurrence,recurrence_every,due_at) values($1,$2,'Other date','daily',1,clock_timestamp()+interval '1 day') returning id",[home,series])).rows[0].id
  await user(owner)
  await sql.query('select public.assign_household_task_occurrence($1,$2,null)',[occurrence,owner])
  await sql.query('select public.assign_household_task_occurrence($1,$2,null)',[occurrence,owner])
  expect((await sql.query<{assigned_to:string|null}>('select assigned_to from public.task_series where id=$1',[series])).rows[0].assigned_to).toBeNull()
  expect((await sql.query<{assigned_to:string|null}>('select assigned_to from public.task_occurrences where id=$1',[second])).rows[0].assigned_to).toBeNull()
  await user(member)
  await expect(sql.query('select public.assign_household_task_occurrence($1,$2,null)',[occurrence,member])).rejects.toThrow('Responsibility changed')
  await expect(sql.query('select public.assign_household_task_occurrence($1,$2,$3)',[occurrence,outsider,owner])).rejects.toThrow('current family member')
  await sql.query('select public.assign_household_task_occurrence($1,$2,$3)',[occurrence,member,owner])
  await sql.query('select public.complete_household_task($1,true)',[occurrence])
  await expect(sql.query('select public.assign_household_task_occurrence($1,null,$2)',[occurrence,member])).rejects.toThrow('Completed task history')
  await user(outsider)
  expect((await sql.query('select * from public.task_occurrences')).rows).toHaveLength(0)
  await expect(sql.query('select public.assign_household_task_occurrence($1,$2,$3)',[occurrence,outsider,member])).rejects.toThrow('Family access denied')
  await sql.exec('reset role;set role anon')
  await expect(sql.query('select public.assign_household_task_occurrence($1,null,null)',[occurrence])).rejects.toThrow()
 }finally{await sql.close()}
},30000)
it('keeps pending reminder recipients consistent with a quick assignment without duplicating sent history',async()=>{
 const {sql,home,task}=await taskFixture()
 try{
  const {occurrence}=await task(null)
  await sql.query('select public.assign_household_task_occurrence($1,$2,null)',[occurrence,member])
  await sql.exec('reset role')
  let pending=await sql.query<{recipient_id:string;delivery_kind:string}>("select recipient_id,delivery_kind from public.scheduled_notifications where household_id=$1 and source_id=$2 and status='pending' order by delivery_kind",[home,`task:${occurrence}`])
  expect(pending.rows).toEqual([{recipient_id:owner,delivery_kind:'overdue_escalation'},{recipient_id:member,delivery_kind:'reminder'}])
  await sql.query("update public.scheduled_notifications set status='sent',sent_at=clock_timestamp() where source_id=$1 and delivery_kind='reminder' and recipient_id=$2",[`task:${occurrence}`,member])
  await sql.query('select public.assign_household_task_occurrence($1,null,$2)',[occurrence,member])
  expect((await sql.query("select id from public.scheduled_notifications where source_id=$1 and recipient_id=$2 and delivery_kind='reminder' and status='sent'",[`task:${occurrence}`,member])).rows).toHaveLength(1)
 }finally{await sql.close()}
},30000)

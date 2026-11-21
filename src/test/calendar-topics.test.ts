import { expect,it } from 'vitest'
import { calendarEventLabel,calendarTopic,matchesCalendarTopic } from '../features/tasks/calendarTopics'
import type { CalendarEvent } from '../features/tasks/model'
import { taskFixture,owner,member,outsider } from './helpers/taskFixture'

const event=(extra:Partial<CalendarEvent>)=>({id:'task:1',source:'task',sourceRecordId:'1',title:'Care',occursAt:'2026-11-21T12:00:00Z',remindAt:null,assignedTo:null,href:'/tasks?occurrence=1',...extra}) as CalendarEvent
it('groups by subject while retaining source identity and routes',()=>{
 const responsibility=event({category:'health'}),appointment=event({id:'health:1',source:'health',eventKind:'appointment',href:'/health/appointments'})
 for(const item of [responsibility,appointment])expect(matchesCalendarTopic(item,'health')).toBe(true)
 expect(calendarEventLabel(responsibility)).toBe('Task')
 expect(calendarEventLabel(appointment)).toBe('Appointment')
 expect(responsibility.href).toBe('/tasks?occurrence=1')
 expect(appointment.href).toBe('/health/appointments')
 expect(calendarTopic(event({careKind:'feeding'}))).toBe('feeding')
 expect(calendarTopic(event({source:'feeding'}))).toBe('feeding')
 expect(calendarTopic(event({careKind:'walk'}))).toBe('walk')
 expect(calendarTopic(event({title:'Vet appointment'}))).toBe('other')
 expect(matchesCalendarTopic(responsibility,'other')).toBe(false)
 expect(matchesCalendarTopic(responsibility,'all')).toBe(true)
 expect(calendarEventLabel(event({source:'health',eventKind:'medication'}))).toBe('Medication')
 expect(calendarEventLabel(event({source:'health',eventKind:'vaccination'}))).toBe('Vaccination')
})
it('persists topic atomically, inherits future dates, keeps completed history and rejects unauthorized writes',async()=>{
 const {sql,user,home,task}=await taskFixture()
 const save=async(category:string,id:string|null=null)=>sql.query<{id:string}>(`select public.save_categorized_household_task($1,$2,'Book a vet visit','',$3,clock_timestamp()+interval '1 day','daily',1,null,$4) id`,[home,id,owner,category])
 try{
  const legacy=await task(null)
  expect((await sql.query<{category:string}>('select category from public.task_series where id=$1',[legacy.series])).rows[0].category).toBe('other')
  const id=(await save('health')).rows[0].id
  expect((await sql.query<{category:string}>('select category from public.task_series where id=$1',[id])).rows[0].category).toBe('health')
  expect((await sql.query<{category:string}>('select distinct category from public.task_occurrences where series_id=$1',[id])).rows).toEqual([{category:'health'}])
  await sql.query("select public.generate_task_occurrences($1,clock_timestamp()+interval '200 days',clock_timestamp()+interval '205 days')",[home])
  expect((await sql.query<{category:string}>('select distinct category from public.task_occurrences where series_id=$1',[id])).rows).toEqual([{category:'health'}])
  const occurrence=(await sql.query<{id:string}>('select id from public.task_occurrences where series_id=$1 order by due_at limit 1',[id])).rows[0].id
  await sql.query('select public.complete_household_task($1,true)',[occurrence])
  await user(member)
  await save('other',id)
  expect((await sql.query<{category:string;completed_by:string}>('select category,completed_by from public.task_occurrences where id=$1',[occurrence])).rows[0]).toEqual({category:'health',completed_by:owner})
  await sql.query("select public.generate_task_occurrences($1,clock_timestamp()+interval '200 days',clock_timestamp()+interval '205 days')",[home])
  expect((await sql.query<{category:string}>('select distinct category from public.task_occurrences where series_id=$1 and completed_at is null',[id])).rows).toEqual([{category:'other'}])
  await expect(save('feeding')).rejects.toThrow('Choose Health or Other')
  await expect(save(null as unknown as string)).rejects.toThrow('Choose Health or Other')
  await user(outsider)
  await expect(save('health',id)).rejects.toThrow('Family access denied')
  expect((await sql.query('select * from public.task_series where id=$1',[id])).rows).toHaveLength(0)
  await sql.exec('reset role;set role anon')
  await expect(save('health')).rejects.toThrow()
 }finally{await sql.close()}
},30000)

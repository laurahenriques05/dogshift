import { loadRoutineCalendarSources } from './routineCalendarData'
import { routineCalendar } from './routineCalendar'
import { readTaskPages } from './data'
import type { TaskOccurrence,VetAppointment,Vaccination,MedicationSchedule,MedicationDose } from '../../lib/supabase/database.types'
import { careHref } from './care'
import { db } from '../../lib/supabase/client'
import type { FeedingEntry, FoodProduct } from '../feeding/types'
import { foodRestockingEvents } from '../feeding/integrations'
import { localTime, toInstant } from '../health/time'
import type { CalendarEvent } from './model'
import { monthRange } from './model'

async function feedingLedger(householdId:string):Promise<FeedingEntry[]> {
 return readTaskPages<FeedingEntry>((start,end)=>db().from('feeding_entries').select('*').eq('household_id',householdId).order('id').range(start,end))
}

export async function loadCalendarEvents(householdId:string,zone:string,month:string):Promise<CalendarEvent[]> {
 const range=monthRange(month);const from=range.from;const until=range.until
 const generated=await db().rpc('generate_task_occurrences',{p_household:householdId,p_from:from,p_until:until})
 if(generated.error)throw generated.error
 const [occurrenceResult,appointmentsResult,vaccinationsResult,schedulesResult,productsResult,entries,routines]=await Promise.all([
  readTaskPages<TaskOccurrence>((start,end)=>db().from('task_occurrences').select('*').eq('household_id',householdId).gte('due_at',from).lt('due_at',until).order('due_at').order('id').range(start,end)).then(data=>({data,error:null})),
  readTaskPages<Pick<VetAppointment,'id'|'title'|'starts_at'>>((start,end)=>db().from('vet_appointments').select('id,title,starts_at').eq('household_id',householdId).gte('starts_at',from).lt('starts_at',until).order('id').range(start,end)).then(data=>({data,error:null})),
  readTaskPages<Pick<Vaccination,'id'|'name'|'next_due_on'>>((start,end)=>db().from('vaccinations').select('id,name,next_due_on').eq('household_id',householdId).not('next_due_on','is',null).gte('next_due_on',`${month}-01`).lt('next_due_on',nextMonth(month)+'-01').order('id').range(start,end)).then(data=>({data,error:null})),
  readTaskPages<Pick<MedicationSchedule,'id'|'name'>>((start,end)=>db().from('medication_schedules').select('id,name').eq('household_id',householdId).order('id').range(start,end)).then(data=>({data,error:null})),
  readTaskPages<FoodProduct>((start,end)=>db().from('food_products').select('*').eq('household_id',householdId).order('id').range(start,end)).then(data=>({data,error:null})),
  feedingLedger(householdId),
  loadRoutineCalendarSources(householdId,from,until,month),
 ])
 for(const result of [occurrenceResult,appointmentsResult,vaccinationsResult,schedulesResult,productsResult])if(result.error)throw result.error
 const people=await db().rpc('get_household_members',{p_household:householdId});if(people.error)throw people.error
 const names=new Map((people.data||[]).map(person=>[person.user_id,person.display_name]))
 const events:CalendarEvent[]=(occurrenceResult.data||[]).map(row=>({id:`task:${row.id}`,source:'task',sourceRecordId:row.id,title:row.title,occursAt:row.due_at,remindAt:new Date(Date.parse(row.due_at)-3600000).toISOString(),assignedTo:row.assigned_to,href:careHref(row),category:row.category,careKind:row.care_kind,assigneeName:names.get(row.assigned_to||'')||'Unassigned',completed:!!row.completed_at}))
 for(const visit of appointmentsResult.data||[])events.push({id:`health:appointment:${visit.id}`,source:'health',eventKind:'appointment',sourceRecordId:visit.id,title:visit.title,occursAt:visit.starts_at,remindAt:new Date(Date.parse(visit.starts_at)-86400000).toISOString(),assignedTo:null,href:'/health/appointments'})
 for(const vaccine of vaccinationsResult.data||[])if(vaccine.next_due_on){const at=toInstant(`${vaccine.next_due_on}T12:00`,zone);events.push({id:`health:vaccination:${vaccine.id}`,source:'health',eventKind:'vaccination',sourceRecordId:vaccine.id,title:`Vaccination · ${vaccine.name}`,occursAt:at,remindAt:null,assignedTo:null,href:`/health/vaccinations?record=${encodeURIComponent(vaccine.id)}`,allDay:true})}
 const schedules=schedulesResult.data||[]
 if(schedules.length){
  const names=new Map(schedules.map(schedule=>[schedule.id,schedule.name]))
  // Batch schedule IDs as well as paging rows: large households must not hit a
  // URL-length limit or silently lose doses after PostgREST's first page.
  for(let index=0;index<schedules.length;index+=100){
   const ids=schedules.slice(index,index+100).map(schedule=>schedule.id)
   const doses=await readTaskPages<Pick<MedicationDose,'id'|'schedule_id'|'scheduled_at'|'status'>>((start,end)=>db().from('medication_doses').select('id,schedule_id,scheduled_at,status').in('schedule_id',ids).gte('scheduled_at',from).lt('scheduled_at',until).order('id').range(start,end))
   for(const dose of doses)events.push({id:`health:medication:${dose.id}`,source:'health',eventKind:'medication',sourceRecordId:dose.id,title:`Medication · ${names.get(dose.schedule_id)||'Dose due'}`,occursAt:dose.scheduled_at,remindAt:dose.scheduled_at,assignedTo:null,href:`/health/medications?dose=${encodeURIComponent(dose.id)}`,completed:dose.status==='given',status:dose.status==='given'?'Given':dose.status==='skipped'?'Skipped':Date.parse(dose.scheduled_at)<Date.now()?'Overdue':'Scheduled'})
  }
 }
 const products=(productsResult.data||[]) as FoodProduct[]
 for(const restock of foodRestockingEvents(products,entries).filter(event=>localTime(event.occursAt,zone).slice(0,7)===month))events.push({id:restock.id,source:'feeding',eventKind:'restock',sourceRecordId:restock.sourceRecordId,title:restock.title,occursAt:restock.occursAt,remindAt:restock.remindAt,assignedTo:null,href:restock.href})
 const validMeals=routines.meals.filter(meal=>meal.outcome==='skipped'||entries.some(entry=>entry.event_id===meal.id&&!entry.deleted_at))
 events.push(...routineCalendar({month,zone,...routines,meals:validMeals,tasks:occurrenceResult.data||[]}))
 return events.sort((a,b)=>a.occursAt.localeCompare(b.occursAt))
}
function nextMonth(month:string){const [year,number]=month.split('-').map(Number);return new Date(Date.UTC(year,number,1)).toISOString().slice(0,7)}

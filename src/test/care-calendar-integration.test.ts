import { expect,it,vi } from 'vitest'
import { taskFixture,owner,outsider } from './helpers/taskFixture'
import { loadCalendarEvents } from '../features/tasks/calendarData'
import { calendarTopic } from '../features/tasks/calendarTopics'

const state=vi.hoisted(()=>({client:null as unknown}))
vi.mock('../lib/supabase/client',()=>({db:()=>state.client}))

// Read the actual disposable SQL database through the calendar's query contract.
// No hosted requests, meals, notifications or GPS are used.
function calendarClient(sql:Awaited<ReturnType<typeof taskFixture>>['sql']){
 return {
  async rpc(name:string,args:Record<string,unknown>){
   const query=name==='generate_task_occurrences'
    ?'select public.generate_task_occurrences($1,$2,$3)'
    :'select * from public.get_household_members($1)'
   const values=name==='generate_task_occurrences'?[args.p_household,args.p_from,args.p_until]:[args.p_household]
   return {data:(await sql.query(query,values)).rows,error:null}
  },
  from(table:string){
   const normalize=(rows:unknown[])=>JSON.parse(JSON.stringify(rows)).map((row:Record<string,unknown>)=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,['next_due_on','local_day'].includes(key)&&typeof value==='string'?value.slice(0,10):value])))
   const allowed=['task_occurrences','vet_appointments','vaccinations','medication_schedules','food_products','feeding_entries','medication_doses','dogs','feeding_settings','feeding_meal_events','walks','walk_daily_plans','walk_daily_checks']
   if(!allowed.includes(table))throw new Error('Unexpected calendar table')
   let columns='*',offset=0,limit=1000,single=false
   const clauses:string[]=[],values:unknown[]=[],order:string[]=[]
   const where=(column:string,operator:string,value:unknown)=>{values.push(value);clauses.push(operator==='= any'?`${column} = any($${values.length})`:`${column} ${operator} $${values.length}`);return builder}
   const builder={
    select(value:string){columns=value;return builder},
    eq:(column:string,value:unknown)=>where(column,'=',value),
    gte:(column:string,value:unknown)=>where(column,'>=',value),
    lt:(column:string,value:unknown)=>where(column,'<',value),
    maybeSingle(){single=true;return builder},
    is(column:string,_value:unknown){clauses.push(`${column} is null`);return builder},
    or(value:string){const parts=value.split(',').map(part=>{const [,column,operator,operand]=part.match(/^(\w+)\.(gte|is)\.(.*)$/)!;if(operator==='is')return `${column} is null`;values.push(operand);return `${column} >= $${values.length}`});clauses.push(`(${parts.join(' or ')})`);return builder},
    not(column:string,_operator:string,_value:unknown){clauses.push(`${column} is not null`);return builder},
    in:(column:string,value:unknown)=>where(column,'= any',value),
    order(column:string){order.push(column);return builder},
    range(start:number,end:number){offset=start;limit=end-start+1;return builder},
    then(resolve:(result:{data:unknown;error:null})=>unknown,reject:(error:unknown)=>unknown){
     const query=`select ${columns} from public.${table}${clauses.length?' where '+clauses.join(' and '):''}${order.length?' order by '+order.join(','):''} limit ${limit} offset ${offset}`
     return sql.query(query,values).then(result=>{const rows=normalize(result.rows);return resolve({data:single?(rows[0]||null):rows,error:null})},reject)
    },
   }
   return builder
  },
 }
}
it('projects real care completion and correction into the calendar without duplicate stock events',async()=>{
 const f=await taskFixture()
 state.client=calendarClient(f.sql)
 try{
  const product=(await f.sql.query<{id:string}>("select public.save_food_product($1,gen_random_uuid(),'Food','dry',100,200,1000,7) id",[f.home])).rows[0].id
  const meal='50000000-0000-0000-0000-000000000091'
  await f.sql.query('select public.save_feeding_plan($1,$2::jsonb,null)',[f.home,JSON.stringify([{id:meal,name:'Dinner',time:'00:00',items:[{product_id:product,quantity_grams:100}]}])])
  await f.sql.exec('reset role')
  const dog=(await f.sql.query<{id:string}>("insert into public.dogs(household_id,name) values($1,'Test dog') returning id",[f.home])).rows[0].id
  await f.user(owner)
  const create=async(kind:string)=>(await f.sql.query<{id:string}>("select public.save_care_task($1,$2,'Care',$3,$4,clock_timestamp(),'none',1,null) id",[f.home,kind,kind==='feeding'?meal:null,owner])).rows[0].id
  const feedingSeries=await create('feeding'),walkSeries=await create('walk')
  const occurrence=async(series:string)=>(await f.sql.query<{id:string}>('select id from public.task_occurrences where series_id=$1',[series])).rows[0].id
  const feeding=await occurrence(feedingSeries),walking=await occurrence(walkSeries)
  const month=new Date().toISOString().slice(0,7)
  let events=await loadCalendarEvents(f.home,'UTC',month)
  expect(events.find(e=>e.id===`task:${feeding}`)).toMatchObject({completed:false,href:`/feed?task=${feeding}`})
  expect(events.find(e=>e.id===`task:${walking}`)).toMatchObject({completed:false,href:`/walks?action=start&task=${walking}`})
  expect(events.filter(e=>e.id===`food-restock:${product}`)).toHaveLength(1)
  const mealEvent='60000000-0000-0000-0000-000000000091'
  const items=JSON.stringify([{product_id:product,quantity_grams:100,eaten_grams:100}])
  await f.sql.query("select public.save_meal_result($1,$2,$3::jsonb,clock_timestamp(),'app',false,$4,'given','',false)",[f.home,mealEvent,items,meal])
  const walk=(await f.sql.query<{id:string}>("select (public.start_task_walk($1,$2,'off',false)).id",[walking,dog])).rows[0].id
  events=await loadCalendarEvents(f.home,'UTC',month)
  expect(events.find(e=>e.id===`task:${feeding}`)).toMatchObject({completed:true,href:`/tasks?occurrence=${feeding}`})
  expect(events.find(e=>e.id===`task:${walking}`)?.completed).toBe(false)
  await f.sql.query("select public.finish_walk($1,clock_timestamp(),'manual')",[walk])
  events=await loadCalendarEvents(f.home,'UTC',month)
  expect(events.find(e=>e.id===`task:${walking}`)).toMatchObject({completed:true,href:`/tasks?occurrence=${walking}`})
  expect(calendarTopic(events.find(e=>e.id===`task:${feeding}`)!)).toBe('feeding')
  expect(calendarTopic(events.find(e=>e.id===`task:${walking}`)!)).toBe('walk')
  await f.sql.query("select public.save_meal_result($1,$2,'[]'::jsonb,clock_timestamp(),'app',false,$3,'skipped','',false)",[f.home,mealEvent,meal])
  expect((await loadCalendarEvents(f.home,'UTC',month)).find(e=>e.id===`task:${feeding}`)?.completed).toBe(false)
  // Starting a normal walk has no occurrence context and does NOT complete a task.
  const unlinked=await occurrence(await create('walk'))
  const normal=(await f.sql.query<{id:string}>("select (public.start_walk_with_options($1,'off',false)).id",[dog])).rows[0].id
  await f.sql.query("select public.finish_walk($1,clock_timestamp(),'manual')",[normal])
  expect((await loadCalendarEvents(f.home,'UTC',month)).find(e=>e.id===`task:${unlinked}`)?.completed).toBe(false)
 }finally{state.client=null;await f.sql.close()}
},30000)

it('keeps Health changes and completion visible, pages all appointments and denies another family',async()=>{
 const f=await taskFixture();state.client=calendarClient(f.sql)
 try{
  const month=new Date().toISOString().slice(0,7)
  const first=month+'-02T12:00:00Z',second=month+'-03T12:00:00Z'
  await f.sql.exec('reset role')
  // More than the normal service page: calendar must not silently truncate.
  await f.sql.query("insert into public.vet_appointments(household_id,title,starts_at) select $1,'Visit '||n,$2::timestamptz from generate_series(1,1001) n",[f.home,first])
  const vaccine=(await f.sql.query<{id:string}>("insert into public.vaccinations(household_id,name,next_due_on) values($1,'Test vaccine',$2::date) returning id",[f.home,month+'-04'])).rows[0].id
  await f.user(owner)
  const schedule=(await f.sql.query<{id:string}>("select public.save_medication_schedule($1,null,'Test medication','Fixture instructions',array[$2::timestamptz,$3::timestamptz]) id",[f.home,first,second])).rows[0].id
  const doses=(await f.sql.query<{id:string}>('select id from public.medication_doses where schedule_id=$1 order by scheduled_at',[schedule])).rows
  await f.sql.query("select public.log_medication_dose($1,'given',clock_timestamp(),'')",[doses[0].id])
  await f.sql.query("select public.log_medication_dose($1,'skipped',null,'')",[doses[1].id])
  let events=await loadCalendarEvents(f.home,'UTC',month)
  expect(events.filter(e=>e.eventKind==='appointment')).toHaveLength(1001)
  expect(events.find(e=>e.id===`health:medication:${doses[0].id}`)).toMatchObject({completed:true,status:'Given',href:`/health/medications?dose=${doses[0].id}`})
  expect(events.find(e=>e.id===`health:medication:${doses[1].id}`)).toMatchObject({completed:false,status:'Skipped'})
  expect(events.find(e=>e.id===`health:vaccination:${vaccine}`)?.href).toBe(`/health/vaccinations?record=${vaccine}`)
  await f.sql.exec('reset role')
  await f.sql.query('update public.vaccinations set next_due_on=$2::date where id=$1',[vaccine,month+'-05'])
  await f.user(owner)
  events=await loadCalendarEvents(f.home,'UTC',month)
  expect(events.find(e=>e.id===`health:vaccination:${vaccine}`)?.occursAt.startsWith(month+'-05')).toBe(true)
  await f.sql.exec('reset role');await f.sql.query('delete from public.vaccinations where id=$1',[vaccine]);await f.user(owner)
  expect((await loadCalendarEvents(f.home,'UTC',month)).some(e=>e.id===`health:vaccination:${vaccine}`)).toBe(false)
  const parent=(await f.sql.query<{id:string}>('select id from public.vet_appointments where household_id=$1 order by id limit 1',[f.home])).rows[0].id
  await f.sql.query("insert into public.appointment_summaries(appointment_id,next_visit_at) values($1,$2::timestamptz)",[parent,month+'-28T12:00:00Z'])
  await f.sql.query('update public.appointment_summaries set next_visit_at=next_visit_at where appointment_id=$1',[parent])
  events=await loadCalendarEvents(f.home,'UTC',month)
  expect(events.filter(e=>e.eventKind==='appointment'&&e.title.startsWith('Follow-up:'))).toHaveLength(1)
  // A failed producer read must fail the calendar, not pretend to load everything.
  const client=calendarClient(f.sql)
  state.client={...client,from(table:string){if(table==='food_products')throw new Error('Simulated source outage');return client.from(table)}}
  await expect(loadCalendarEvents(f.home,'UTC',month)).rejects.toThrow('Simulated source outage')
  state.client=client
  await f.user(outsider)
  await expect(loadCalendarEvents(f.home,'UTC',month)).rejects.toThrow()
 }finally{state.client=null;await f.sql.close()}
},30000)

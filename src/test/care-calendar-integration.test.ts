import { expect,it,vi } from 'vitest'
import { taskFixture,owner } from './helpers/taskFixture'
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
   const allowed=['task_occurrences','vet_appointments','vaccinations','medication_schedules','food_products','feeding_entries','medication_doses']
   if(!allowed.includes(table))throw new Error('Unexpected calendar table')
   let columns='*',offset=0,limit=1000
   const clauses:string[]=[],values:unknown[]=[],order:string[]=[]
   const where=(column:string,operator:string,value:unknown)=>{values.push(value);clauses.push(`${column} ${operator} $${values.length}`);return builder}
   const builder={
    select(value:string){columns=value;return builder},
    eq:(column:string,value:unknown)=>where(column,'=',value),
    gte:(column:string,value:unknown)=>where(column,'>=',value),
    lt:(column:string,value:unknown)=>where(column,'<',value),
    not(column:string,_operator:string,_value:unknown){clauses.push(`${column} is not null`);return builder},
    in:(column:string,value:unknown)=>where(column,'= any',value),
    order(column:string){order.push(column);return builder},
    range(start:number,end:number){offset=start;limit=end-start+1;return builder},
    then(resolve:(result:{data:unknown[];error:null})=>unknown,reject:(error:unknown)=>unknown){
     const query=`select ${columns} from public.${table}${clauses.length?' where '+clauses.join(' and '):''}${order.length?' order by '+order.join(','):''} limit ${limit} offset ${offset}`
     return sql.query(query,values).then(result=>resolve({data:JSON.parse(JSON.stringify(result.rows)),error:null}),reject)
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

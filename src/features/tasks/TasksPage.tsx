import { Select } from '../../components/ui/Select'
import { taskKinds,isCareTaskKind,type TaskKind } from './taskKinds'
import { careHref,careError } from './care'
import type { PlannedMeal } from '../feeding/types'
import { useCallback,useEffect,useMemo,useRef,useState,type FormEvent } from 'react'
import { Link,useSearchParams } from 'react-router-dom'
import { CalendarDays,Check,ChevronDown,Clock,MoreHorizontal,Plus,Repeat2,RotateCcw,UserRound,Utensils,Footprints } from 'lucide-react'
import { Button,EmptyState,Field,LoadingPlaceholder,Notice,PageTitle,isSchemaUnavailable,errorMessage } from '../../components/ui'
import { Modal } from '../../components/ui/Modal'
import { db } from '../../lib/supabase/client'
import type { FamilyMember,TaskSeries } from '../../lib/supabase/database.types'
import { localTime,toInstant } from '../health/time'
import { useAuth } from '../auth/AuthProvider'
import { useHousehold } from '../household/HouseholdProvider'
import { loadTaskData } from './data'
import { groupTasks,type TaskRow } from './board'
import { recurrenceLabel,taskStatus } from './model'
import './tasks.css'

type TaskForm={requestId:string;kind:TaskKind;meal:string;title:string;details:string;assignedTo:string;firstDue:string;recurrence:TaskSeries['recurrence'];every:number;endsOn:string}
function newForm(zone:string,assignee=''):TaskForm{return {requestId:crypto.randomUUID(),kind:'feeding',meal:'',title:'',details:'',assignedTo:assignee,firstDue:localTime(new Date(Date.now()+3600000).toISOString(),zone),recurrence:'none',every:1,endsOn:''}}
function friendlyError(error:unknown){return isSchemaUnavailable(error)?'This task action is not available yet. You can reload your tasks; nothing needs to be reset.':errorMessage(error)}
export function TasksPage(){const {household}=useHousehold();return household?<HouseholdTasks key={household.id}/>:null}
function HouseholdTasks(){
 const {household,dog}=useHousehold(),{session}=useAuth(),[search,setSearch]=useSearchParams()
 const home=household!,zone=home.timezone,user=session!.user.id,focusId=search.get('occurrence')
 const [data,setData]=useState<Awaited<ReturnType<typeof loadTaskData>>>({series:[],occurrences:[],members:[]})
 const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[actionError,setActionError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const [editing,setEditing]=useState<TaskSeries|null>(null),[formOpen,setFormOpen]=useState(false),[form,setForm]=useState(()=>newForm(zone,user)),[formError,setFormError]=useState(''),[advanced,setAdvanced]=useState(false),[archive,setArchive]=useState<TaskSeries|null>(null)
 const [meals,setMeals]=useState<PlannedMeal[]>([])
 const [now,setNow]=useState(()=>new Date()),version=useRef(0)
 const load=useCallback(async(foreground=true)=>{
  const request=++version.current;if(foreground)setLoading(true);setLoadError('')
  try{const [result,settings]=await Promise.all([loadTaskData(home.id,focusId),db().from('feeding_settings').select('meal_plan').eq('household_id',home.id).maybeSingle()]);if(settings.error)throw settings.error;if(request===version.current){setData(result);setMeals(settings.data?.meal_plan||[])}}
  catch(error){if(request===version.current)setLoadError(friendlyError(error))}
  finally{if(request===version.current)setLoading(false)}
 },[home.id,focusId])
 useEffect(()=>{void load();return()=>{version.current++}},[load])
 useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),60000);return()=>window.clearInterval(timer)},[])
 useEffect(()=>{const refresh=()=>{if(!busy&&document.visibilityState==='visible')void load(false)};window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh)},[load,busy])
 const names=useMemo(()=>new Map(data.members.map(person=>[person.user_id,person.display_name])),[data.members])
 const series=useMemo(()=>new Map(data.series.map(task=>[task.id,task])),[data.series])
 const rows=useMemo<TaskRow[]>(()=>data.occurrences.flatMap(row=>{const task=series.get(row.series_id);return task?[{...row,task}]:[]}),[data.occurrences,series])
 const groups=groupTasks(rows.filter(row=>row.id!==focusId),zone,now),focused=focusId?rows.find(row=>row.id===focusId):undefined
 function openForm(task?:TaskSeries){setEditing(task||null);setForm(task?{requestId:crypto.randomUUID(),kind:task.care_kind||task.category||'other',meal:task.care_meal_id||'',title:task.title,details:task.details,assignedTo:task.assigned_to||'',firstDue:localTime(task.first_due_at,zone),recurrence:task.recurrence,every:task.recurrence_every,endsOn:task.ends_on||''}:newForm(zone,user));setAdvanced(!!task&&(!!task.details||task.recurrence!=='none'));setFormError('');setFormOpen(true)}
 useEffect(()=>{if(search.get('new')==='1'&&!loading&&!loadError){openForm();const next=new URLSearchParams(search);next.delete('new');setSearch(next,{replace:true})}},[search,loading,loadError])
 async function save(event:FormEvent){event.preventDefault();if(busy)return;setBusy(true);setFormError('');setMessage('')
  try{
   const result=editing||!isCareTaskKind(form.kind)?await db().rpc('save_categorized_household_task',{p_category:form.kind==='health'?'health':'other',p_household:home.id,p_id:editing?.id||null,p_title:form.title.trim(),p_details:form.details,p_assigned_to:form.assignedTo||null,p_first_due_at:toInstant(form.firstDue,zone),p_recurrence:form.recurrence,p_recurrence_every:form.recurrence==='none'?1:form.every,p_ends_on:form.recurrence==='none'||!form.endsOn?null:form.endsOn}):await db().rpc('save_care_task',{p_request:form.requestId,p_household:home.id,p_kind:form.kind,p_title:form.title.trim()||(form.kind==='feeding'?meals.find(meal=>meal.id===form.meal)?.name||'Feed':`Walk ${dog?.name||'the dog'}`),p_meal:form.kind==='feeding'?form.meal:null,p_assigned_to:form.assignedTo||null,p_first_due_at:toInstant(form.firstDue,zone),p_recurrence:form.recurrence,p_recurrence_every:form.recurrence==='none'?1:form.every,p_ends_on:form.recurrence==='none'||!form.endsOn?null:form.endsOn})
   if(result.error)throw result.error
   setFormOpen(false);setMessage(editing?'Task updated. Completed history is kept.':'Task added to your family plan.');if(focusId)setSearch({}, {replace:true});await load(false)
  }catch(error){setFormError(friendlyError(error))}finally{setBusy(false)}
 }
 async function complete(row:TaskRow,value:boolean){if(busy)return;setBusy(true);setActionError('');setMessage('')
  try{const result=await db().rpc('complete_household_task',{p_occurrence:row.id,p_completed:value});if(result.error)throw result.error;setMessage(value?`${row.title} is done. Saved to your family’s completed tasks.`:'Completion undone. This task is open again.');await load(false)}
  catch(error){setActionError(careError(error))}finally{setBusy(false)}
 }
 async function assign(row:TaskRow,assignee:string|null){if(busy||row.assigned_to===assignee)return;setBusy(true);setActionError('');setMessage('')
  try{const result=row.care_kind?await db().rpc('assign_care_task_occurrence',{p_occurrence:row.id,p_assigned_to:assignee,p_expected_version:row.assignment_version??0}):await db().rpc('assign_household_task_occurrence',{p_occurrence:row.id,p_assigned_to:assignee,p_expected_assignee:row.assigned_to});if(result.error)throw result.error;setMessage(assignee===user?'You’re taking care of this task.':assignee?'Responsibility updated for this date.':'This task is available to anyone in the family.');await load(false)}
  catch(error){setActionError(careError(error))}finally{setBusy(false)}
 }
 async function stop(){if(!archive||busy)return;setBusy(true);setActionError('')
  try{const result=await db().rpc('archive_household_task',{p_household:home.id,p_task:archive.id});if(result.error)throw result.error;setArchive(null);setMessage('Future dates stopped. Completed and overdue history is kept.');await load(false)}
  catch(error){setActionError(careError(error))}finally{setBusy(false)}
 }
 const actions={zone,user,names,members:data.members,busy:busy||loading,onComplete:complete,onAssign:assign,onEdit:openForm,onStop:setArchive,now:now.getTime()}
 return <div className="task-page tasks-experience">
  <PageTitle eyebrow="TASKS AND CALENDAR" title="A little planning, shared care.">A clear plan for {dog?.name}’s day. Share the care, one task at a time.</PageTitle>
  <nav className="task-hub-nav" aria-label="Tasks and calendar"><Link className="is-active" aria-current="page" to="/tasks">Tasks</Link><Link to="/calendar">Calendar</Link></nav>
  <div className="tasks-day-heading"><div><p className="eyebrow">{new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'long',day:'numeric',month:'long'}).format(now)}</p><h2>Today’s plan</h2></div><Button disabled={loading||!!loadError} onClick={()=>openForm()}><Plus size={17}/>Add task</Button></div>
  {message&&<Notice>{message}</Notice>}{actionError&&<Notice error>{actionError}<Button className="secondary" disabled={busy} onClick={()=>void load()}>Reload tasks</Button></Notice>}
  {loadError?<section className="card tasks-state"><Notice error>We couldn’t load your family’s tasks. {loadError}</Notice><Button className="secondary" onClick={()=>void load()}>Reload tasks</Button></section>:loading?<LoadingPlaceholder label="Loading your family’s plan" lines={3}/>:<>
   {focusId&&<section className="card tasks-focused"><div className="tasks-section-heading"><h2>Selected task</h2><Link className="text-link" to="/tasks">Show today’s plan</Link></div>{focused?<TaskItem row={focused} {...actions}/>:<p>This task is unavailable in this family. It may have been rescheduled or removed.</p>}</section>}
   {!focusId&&<><TaskGroup title="Today" subtitle="Your household’s local time" rows={groups.today} {...actions} empty={<EmptyState icon={<Check size={21}/>} title="All clear for today">{groups.upcoming.length?'Your next responsibilities are below.':'Add a task when your dog needs a little extra care.'}</EmptyState>}/>
   {groups.overdue.length>0&&<TaskGroup title="Needs attention" subtitle={`${groups.overdue.length} overdue from earlier days`} rows={groups.overdue} {...actions}/>}
   {groups.upcoming.length>0&&<TaskGroup title="Coming up" subtitle="Your next shared responsibilities" rows={groups.upcoming} {...actions}/>}
   <details className="card tasks-completed"><summary><span><Check size={17}/>Completed</span><span>{groups.completed.length}<ChevronDown size={16}/></span></summary><p className="tasks-caption">Last 90 days · Feeding and Walks reflect their saved activity.</p>{groups.completed.length?<TaskGroup title="Completed tasks" rows={groups.completed} {...actions} nested/>:<p className="muted">Your completed tasks will appear here.</p>}</details></>}
  </>}
  <p className="tasks-caption"><CalendarDays size={14}/>Times follow {zone}. All family members can manage shared tasks.</p>
  {formOpen&&<Modal title={editing?'Edit task':'Add a task'} description={editing?.recurrence!=='none'&&editing?'Changes apply to future open dates in this series. Completed history is kept.':'Choose what needs doing, when, and who can help.'} onClose={()=>setFormOpen(false)} busy={busy}>
   <form onSubmit={save}><fieldset disabled={busy} className="tasks-form-fields">{(!editing||!editing.care_kind)&&<label className="field">Type<Select autoFocus value={form.kind} onChange={e=>setForm({...form,kind:e.target.value as TaskKind,title:editing?form.title:e.target.value==='walk'?`Walk ${dog?.name||'the dog'}`:'',meal:''})}>{taskKinds.filter(kind=>!editing||!isCareTaskKind(kind.value)).map(kind=><option key={kind.value} value={kind.value}>{kind.label}</option>)}</Select></label>}{form.kind==='health'&&<p className="tasks-caption">A responsibility such as booking a visit. Create the appointment or medication record in Health; both appear under Health in the calendar.</p>}{!editing&&form.kind==='feeding'?<label className="field">Meal<Select required value={form.meal} onChange={e=>{const meal=meals.find(m=>m.id===e.target.value);setForm({...form,meal:e.target.value,title:meal?.name||''})}}><option value="">Choose a saved meal…</option>{meals.map(meal=><option key={meal.id} value={meal.id}>{meal.name} · {meal.time}</option>)}</Select>{!meals.length&&<span>Set a meal in <Link to="/feed">Feeding</Link> first.</span>}</label>:<Field label="Name" required maxLength={100} placeholder={form.kind==='walk'?`Walk ${dog?.name||'the dog'}`:form.kind==='health'?'e.g. Book a vet visit':'e.g. Brush the dog'} value={form.title} onChange={event=>setForm({...form,title:event.target.value})}/>}<Field label={`Due date and time · ${zone}`} type="datetime-local" required value={form.firstDue} onChange={event=>setForm({...form,firstDue:event.target.value})}/><label className="field">Who’s taking care of it?<Select value={form.assignedTo} onChange={event=>setForm({...form,assignedTo:event.target.value})}><option value="">{editing?'Anyone in the family':'Unassigned'}</option>{data.members.map(person=><option key={person.user_id} value={person.user_id}>{person.display_name}{person.user_id===user?' (you)':''}</option>)}</Select></label>
    <details open={advanced} className="tasks-advanced" onToggle={event=>setAdvanced(event.currentTarget.open)}><summary>Advanced options <ChevronDown size={15}/></summary><label className="field">Repeat<Select value={form.recurrence} onChange={event=>setForm({...form,recurrence:event.target.value as TaskSeries['recurrence'],endsOn:''})}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></Select></label>{form.recurrence!=='none'&&<div className="task-form-grid"><Field label="Every" type="number" min={1} max={52} required value={form.every} onChange={event=>setForm({...form,every:Number(event.target.value)})}/><Field label="Until (optional)" type="date" min={form.firstDue.slice(0,10)} value={form.endsOn} onChange={event=>setForm({...form,endsOn:event.target.value})}/></div>}{(editing||!isCareTaskKind(form.kind))&&<label className="field">Details (optional)<textarea rows={3} maxLength={1200} value={form.details} onChange={event=>setForm({...form,details:event.target.value})}/></label>}<p className="tasks-caption">Monthly tasks use the last day when a month is shorter.</p></details>
    {formError&&<Notice error>{formError}</Notice>}<div className="tasks-modal-actions"><Button type="button" className="secondary" onClick={()=>setFormOpen(false)}>Cancel</Button><Button>{busy?'Saving…':editing?'Save changes':'Add task'}</Button></div>
   </fieldset></form>
  </Modal>}
  {archive&&<Modal title={`Stop “${archive.title}”?`} description="Future dates will stop. Overdue tasks and completed history remain available." busy={busy} onClose={()=>setArchive(null)}>{actionError&&<Notice error>{actionError}</Notice>}<div className="tasks-modal-actions"><Button className="secondary" disabled={busy} onClick={()=>setArchive(null)}>Keep task</Button><Button disabled={busy} onClick={()=>void stop()}>{busy?'Stopping…':'Stop future dates'}</Button></div></Modal>}
 </div>
}

type ItemActions={zone:string;user:string;names:Map<string,string>;members:FamilyMember[];busy:boolean;now:number;onComplete:(row:TaskRow,value:boolean)=>Promise<void>;onAssign:(row:TaskRow,user:string|null)=>Promise<void>;onEdit:(task:TaskSeries)=>void;onStop:(task:TaskSeries)=>void}
function TaskGroup({title,subtitle,rows,empty,nested=false,...actions}:ItemActions&{title:string;subtitle?:string;rows:TaskRow[];empty?:React.ReactNode;nested?:boolean}){
 const [count,setCount]=useState(8)
 return <section className={nested?'tasks-group-nested':'card tasks-group'} aria-label={title}>{!nested&&<div className="tasks-section-heading"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><span className="tasks-count">{rows.length}</span></div>}{rows.length?<ul className="tasks-items">{rows.slice(0,count).map(row=><li key={row.id}><TaskItem row={row} {...actions}/></li>)}</ul>:empty}{rows.length>count&&<Button className="secondary tasks-show-more" onClick={()=>setCount(value=>value+20)}>Show {Math.min(rows.length-count,20)} more</Button>}</section>
}
function TaskItem({row,zone,user,names,members,busy,now,onComplete,onAssign,onEdit,onStop}:ItemActions&{row:TaskRow}){
 const status=taskStatus(row,now),own=row.completed_by===user
 const [changing,setChanging]=useState(false)
 const [choice,setChoice]=useState(row.assigned_to||'')
 const date=localTime(row.due_at,zone),today=localTime(new Date(now).toISOString(),zone).slice(0,10)
 const label=date.startsWith(today)?date.slice(11):`${new Intl.DateTimeFormat('en-GB',{timeZone:zone,day:'numeric',month:'short'}).format(new Date(row.due_at))} · ${date.slice(11)}`
 if(row.care_kind)return <article className={`tasks-item care-task ${status==='completed'?'is-done':''} ${status==='overdue'?'is-overdue':''} ${!row.assigned_to?'is-unassigned':''}`} id={`task-${row.id}`}>
  <span className="care-task-icon" aria-hidden="true">{row.care_kind==='feeding'?<Utensils size={20}/>:<Footprints size={20}/>}</span>
  <div className="tasks-item-copy"><strong>{row.title}</strong><div className="tasks-item-meta"><time dateTime={row.due_at}>{label}</time><span>{status==='completed'?'Completed':status==='overdue'?'Overdue':'Pending'}</span></div><p><UserRound size={13} aria-hidden="true"/> {row.assigned_to===user?'You':names.get(row.assigned_to||'')||'Unassigned'}</p>{row.completed_at&&<small>Saved by {own?'you':names.get(row.completed_by||'')||'a former member'}</small>}
   {status!=='completed'&&<div className="care-task-actions">{row.assigned_to!==user?<Button disabled={busy} onClick={()=>void onAssign(row,user)}>Take task</Button>:<Link className="button care-open" to={careHref(row)}>{row.care_kind==='feeding'?'Open meal':row.walk_id?'Continue walk':'Start walk'}</Link>}<button className="text-link" disabled={busy} onClick={()=>{setChoice(row.assigned_to||'');setChanging(true)}}>Change person</button></div>}
  </div>{status!=='completed'&&!row.task.archived_at&&<button className="tasks-undo" disabled={busy} aria-label={`Stop future dates for ${row.title}`} onClick={()=>onStop(row.task)}><MoreHorizontal size={20}/></button>}
  {changing&&<Modal title="Change responsible member" description="Only this occurrence changes." busy={busy} onClose={()=>setChanging(false)}><label className="field">Responsible member<Select value={choice} disabled={busy} onChange={e=>setChoice(e.target.value)}><option value="">Unassigned</option>{members.map(person=><option key={person.user_id} value={person.user_id}>{person.display_name}</option>)}</Select></label><div className="tasks-modal-actions"><Button className="secondary" disabled={busy} onClick={()=>setChanging(false)}>Cancel</Button><Button disabled={busy} onClick={async()=>{setChanging(false);await onAssign(row,choice||null)}}>Save</Button></div></Modal>}
 </article>
 return <article className={`tasks-item ${status==='completed'?'is-done':''}`} id={`task-${row.id}`}>
  <button type="button" className={`tasks-complete-button ${status==='completed'?'is-done':''}`} aria-label={status==='completed'?own?`Undo ${row.title}`:`${row.title} completed by ${names.get(row.completed_by||'')||'a former member'}`:`Complete ${row.title}`} disabled={busy||(status==='completed'&&!own)} onClick={()=>void onComplete(row,status!=='completed')}>{status==='completed'?<Check size={18}/>:<span/>}</button>
  <div className="tasks-item-copy"><strong>{row.title}</strong><div className="tasks-item-meta"><span className={status==='overdue'?'tasks-overdue-label':''}><Clock size={13}/>{label}{status==='overdue'?' · Overdue':''}</span>{row.recurrence!=='none'&&<span><Repeat2 size={13}/>{recurrenceLabel(row)}</span>}</div><small>{row.category==='health'?'Health task':'Other task'}</small>{row.details&&<p>{row.details}</p>}{row.completed_at?<small>Done by {own?'you':names.get(row.completed_by||'')||'a former member'}</small>:<div className="tasks-assignment">{!row.assigned_to?<button type="button" disabled={busy} onClick={()=>void onAssign(row,user)}><UserRound size={13}/>I’ll do it</button>:<span><UserRound size={13}/>{row.assigned_to===user?'You':names.get(row.assigned_to)||'Former member'}</span>}<label className="tasks-assign-select"><span className="sr-only">Assign {row.title} for this date</span><Select aria-label={`Assign ${row.title} for this date`} disabled={busy} value={row.assigned_to||''} onChange={event=>void onAssign(row,event.target.value||null)}>{!members.some(person=>person.user_id===row.assigned_to)&&<option value={row.assigned_to||''} disabled>{row.assigned_to?'Former member':'Choose a member'}</option>}{members.map(person=><option key={person.user_id} value={person.user_id}>{person.display_name}{person.user_id===user?' (you)':''}</option>)}</Select></label></div>}</div>
  {status==='completed'?(own&&<button type="button" className="tasks-undo" disabled={busy} aria-label={`Undo ${row.title} completion`} onClick={()=>void onComplete(row,false)}><RotateCcw size={15}/></button>):!row.task.archived_at&&<details className="tasks-item-menu"><summary aria-label={`Options for ${row.title}`}><MoreHorizontal size={20}/></summary><div><button disabled={busy} onClick={()=>onEdit(row.task)}>{row.recurrence==='none'?'Edit task':'Edit recurring series'}</button><button disabled={busy} onClick={()=>onStop(row.task)}>Stop future dates</button></div></details>}
 </article>
}

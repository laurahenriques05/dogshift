import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, BookOpen, Check, LockKeyhole, Trash2 } from 'lucide-react'
import { Button, LoadingPlaceholder, Notice, PageTitle, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
import type { AcademyModuleProgress, AcademyPractice, AcademySubchallengeProgress } from '../../lib/supabase/database.types'
import { useAuth } from '../auth/AuthProvider'
import { useHousehold } from '../household/HouseholdProvider'
import { academyModules, ACADEMY_RULES, isModuleUnlocked } from './catalog'
import { academyProgress } from './progress'
import { AcademyDashboard } from './AcademyDashboard'
import { GuidedLesson } from './GuidedLesson'
import './academy.css'

export function AcademyPage(){const {household,dog}=useHousehold();return household&&dog?<HouseholdAcademy key={`${household.id}:${dog.id}`}/>:null}

function HouseholdAcademy(){
 const {moduleId}=useParams();const {household,dog}=useHousehold();const {session}=useAuth()
 const [records,setRecords]=useState<AcademyPractice[]>([]),[milestones,setMilestones]=useState<AcademyModuleProgress[]>([]),[subchallengeProgress,setSubchallengeProgress]=useState<AcademySubchallengeProgress[]>([]),[names,setNames]=useState(new Map<string,string>()),[availableModuleIds,setAvailableModuleIds]=useState<Set<string>>(new Set())
 const [hasLoaded,setHasLoaded]=useState(false),requestVersion=useRef(0)
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 const load=useCallback(async()=>{
  if(!household)return;const request=++requestVersion.current;setLoading(true);setError('')
  try{const [practice,progress,people,catalog]=await Promise.all([db().from('academy_practice').select('*').eq('household_id',household.id).is('deleted_at',null).order('practiced_at',{ascending:false}).limit(100),db().from('academy_module_progress').select('*').eq('household_id',household.id),db().rpc('get_household_members',{p_household:household.id}),db().from('academy_modules').select('id')]);if(practice.error)throw practice.error;if(progress.error)throw progress.error;if(people.error)throw people.error;if(catalog.error)throw catalog.error;if(request!==requestVersion.current)return;const ids=new Set((catalog.data||[]).map(item=>item.id));setRecords(practice.data||[]);setMilestones(progress.data||[]);setNames(new Map((people.data||[]).map(person=>[person.user_id,person.display_name])));setAvailableModuleIds(ids);if(ids.has('stay')){const parts=await db().from('academy_subchallenge_progress').select('*').eq('household_id',household.id);if(parts.error)throw parts.error;if(request===requestVersion.current)setSubchallengeProgress(parts.data||[])}else setSubchallengeProgress([]);if(request===requestVersion.current)setHasLoaded(true)}
  catch(e){if(request===requestVersion.current)setError(errorMessage(e))}finally{if(request===requestVersion.current)setLoading(false)}
 },[household?.id])
 useEffect(()=>{void load();return()=>{requestVersion.current++}},[load,retry])
 const progress=useMemo(()=>academyProgress(records,household?.timezone||'UTC',new Date(),milestones),[records,milestones,household?.timezone])
 const module=academyModules.find(item=>item.id===moduleId)
 if(module&&module.courseId!=='trick-training')return <Navigate to="/academy" replace/>
 if(moduleId&&!module)return <div className="academy-page"><PageTitle eyebrow="PAWSHARE ACADEMY" title="Challenge not found."/><Link className="text-link" to="/academy">Back to Academy</Link></div>
 if(loading&&!hasLoaded)return <div className="academy-page"><PageTitle eyebrow="PAWSHARE ACADEMY" title={module?.title||'Teach a little, together.'}/><LoadingPlaceholder label="Loading Academy progress and challenge access" lines={3}/></div>
 if(error&&!hasLoaded)return <div className="academy-page"><PageTitle eyebrow="PAWSHARE ACADEMY" title="Academy is temporarily unavailable.">We couldn’t load the training journey. Try again in a moment; opening this page does not change your progress.</PageTitle><Notice error>We couldn’t connect to your household’s training records.</Notice><Button className="secondary" onClick={()=>setRetry(value=>value+1)}>Try again</Button><p><Link className="text-link" to="/more">Back to More</Link></p></div>
 if(module&&availableModuleIds.has(module.id)&&!isModuleUnlocked(module,progress.completedIds))return <div className="academy-page"><PageTitle eyebrow="PAWSHARE ACADEMY" title="A little more practice first.">Complete the previous challenge together to unlock this one.</PageTitle><Link className="text-link" to="/academy">Back to Academy</Link></div>
 return <div className="academy-page academy-experience" aria-busy={loading}>
  {error&&<Notice error>We couldn’t refresh your progress. Your last loaded journey is shown. <Button className="secondary" onClick={()=>setRetry(value=>value+1)}>Reload progress</Button></Notice>}
  {module?<><Link className="academy-back" to="/academy"><ArrowLeft size={16}/>Back to your journey</Link><PageTitle eyebrow={`${module.courseTitle.toUpperCase()} · COURSE LEVEL ${module.level} · CHALLENGE ${module.position}`} title={module.title}>{module.objective}</PageTitle>
   {progress.completedIds.has(module.id)&&<section className="academy-achieved"><div><Check size={19}/><span><strong>Challenge achieved</strong><small>Keep practising whenever you like. Your shared milestone is saved.</small></span></div><Link to={progress.nextModule?`/academy/${progress.nextModule.id}`:'/academy'}>{progress.nextModule?'Next challenge':'View your journey'}<ArrowUpRight size={16}/></Link></section>}
   <article className="card academy-lesson-card"><p className="academy-meta"><BookOpen size={16}/>{module.subchallenges?.length?(availableModuleIds.has(module.id)?'Short sessions · progress saves as you go':'Short sessions · guided steps'): `About ${module.estimatedMinutes} minutes`}</p>
    {!availableModuleIds.has(module.id)&&<Notice>Preview only: you can read this challenge, but saving practice is not available yet.</Notice>}
    {!module.subchallenges?.length&&<GuidedLesson key={module.id} module={module}/>}
    {module.subchallenges&&<section className="academy-lesson-section"><h2>{module.sections[0].heading}</h2><p>{module.sections[0].text}</p></section>}
    {module.subchallenges?.length? <SubchallengePath moduleId={module.id} householdId={household!.id} dogId={dog!.id} parts={module.subchallenges} progress={subchallengeProgress.filter(part=>part.module_id===module.id&&part.dog_id===dog!.id)} available={availableModuleIds.has(module.id)} onSaved={load}/>:null}
    {availableModuleIds.has(module.id)&&(!module.subchallenges?.length||module.subchallenges.every(part=>subchallengeProgress.some(saved=>saved.module_id===module.id&&saved.dog_id===dog!.id&&saved.subchallenge_id===part.id)))&&<section className="academy-try" id="academy-practice"><h2>{module.subchallenges?.length?'Final practice':'Try it with your dog'}</h2><p>{module.subchallenges?.length?`All parts are done. Record the final practice to earn ${ACADEMY_RULES.xpPerModule} shared XP once for the household.`:`Save what you practised. Completing this challenge earns ${ACADEMY_RULES.xpPerModule} shared XP once for the household.`}</p><PracticeForm key={module.id} moduleId={module.id} householdId={household!.id} dogId={dog!.id} alreadyComplete={progress.completedIds.has(module.id)} onSaved={load}/></section>}
    <details className="academy-check"><summary>Training reminder</summary><h3>{module.question}</h3><p><strong>{module.answer}</strong></p><p>{module.feedback}</p></details>
    {module.sources.length>0&&<aside className="academy-sources"><h2>Learn more</h2><ul>{module.sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} <ArrowUpRight size={14}/></a></li>)}</ul></aside>}
   </article>
   <details className="card academy-history"><summary>Family practice notes</summary>{loading?<p role="status">Loading practice…</p>:records.filter(record=>record.module_id===module.id).length===0?<p className="muted">No practice saved for this challenge yet.</p>:<ul className="academy-practice-list">{records.filter(record=>record.module_id===module.id).map(record=><li key={record.id}><div><strong>{record.completed?'Challenge achieved':'Practice attempt'} · {record.user_id===session?.user.id?'you':names.get(record.user_id||'')||'Former family member'}</strong><small>{new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short',timeZone:household!.timezone,hour12:false}).format(new Date(record.practiced_at))}</small>{record.performance&&<p>{record.performance}</p>}</div>{record.user_id===session?.user.id&&<div className="academy-own-actions"><PracticeEdit record={record} householdId={household!.id} dogId={dog!.id} onSaved={load}/><PracticeDelete record={record} householdId={household!.id} dogId={dog!.id} onDeleted={load}/></div>}</li>)}</ul>}</details>
  </>:<>
   <PageTitle eyebrow="PAWSHARE ACADEMY" title="Little wins, learned together.">Teach {dog?.name} a new trick with short, practical sessions at your dog’s pace.</PageTitle>
   <AcademyDashboard dogName={dog!.name} completedIds={progress.completedIds} records={records} parts={subchallengeProgress.filter(part=>part.dog_id===dog!.id)} available={availableModuleIds} names={names} xp={progress.xp} level={progress.level} streak={progress.streak} zone={household!.timezone}/>
  </>}
 </div>
}

function PracticeForm({moduleId,householdId,dogId,onSaved,initialRecord,onCancel,alreadyComplete=false}:{moduleId:string;householdId:string;dogId:string;alreadyComplete?:boolean;onSaved:()=>Promise<void>;initialRecord?:AcademyPractice;onCancel?:()=>void}){
 const module=academyModules.find(item=>item.id===moduleId)!;const [checklist,setChecklist]=useState<Record<string,boolean>>(()=>initialRecord?.checklist||{});const [performance,setPerformance]=useState(initialRecord?.performance||'');const [completed,setCompleted]=useState(initialRecord?.completed||false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');const [operationId,setOperationId]=useState(()=>initialRecord?.id||crypto.randomUUID())
 async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');setMessage('')
  if(completed&&!module.checklist.every((_,index)=>checklist[String(index)])){setError('Complete each practice step before marking this challenge achieved.');setBusy(false);return}
  try{const result=await db().rpc('save_academy_practice',{p_household:householdId,p_id:operationId,p_dog:dogId,p_module:moduleId,p_checklist:checklist,p_performance:performance,p_completed:completed});if(result.error)throw result.error;setMessage(initialRecord?'Your practice note was updated.':completed&&!alreadyComplete?'Challenge achieved. Your family’s progress is saved.':'Practice saved. Every calm attempt counts.');if(!initialRecord){setChecklist({});setPerformance('');setCompleted(false);setOperationId(crypto.randomUUID())}await onSaved()}
  catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 return <form className="academy-practice-form" onSubmit={save}>{error&&<Notice error>{error}</Notice>}{message&&<Notice>{message}</Notice>}
  <fieldset disabled={busy}><legend>What did you practise?</legend><p className="academy-soft-copy">Tick what you tried. You can save a practice even if your dog is still learning.</p>{module.checklist.map((item,index)=><label className="academy-check-row" key={item}><input type="checkbox" checked={!!checklist[String(index)]} onChange={e=>setChecklist({...checklist,[String(index)]:e.target.checked})}/><span>{item}</span></label>)}
   <details className="academy-note-toggle"><summary>Add a practice note (optional)</summary><label className="field">How did it go?<textarea maxLength={1200} rows={3} value={performance} onChange={e=>setPerformance(e.target.value)} placeholder="What went well? What will you try next?"/></label></details>
   <label className="academy-complete-row"><input type="checkbox" checked={completed} disabled={initialRecord?.completed||alreadyComplete} onChange={e=>setCompleted(e.target.checked)}/><span>{initialRecord?.completed||alreadyComplete?'Your household has already achieved this challenge':'Our dog can do this challenge'}</span></label>
   <p className="academy-practice-hint">{alreadyComplete?'Revisiting this trick will not award extra XP.':completed?'Complete all practice steps, then save to achieve the challenge.':'Still learning is progress. Save this session and try again another day.'}</p><Button disabled={busy}>{busy?'Saving…':initialRecord?'Save changes':completed&&!alreadyComplete?'Complete challenge':'Save practice'}</Button>{onCancel&&<Button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancel</Button>}
  </fieldset>
 </form>
}

function SubchallengePath({moduleId,householdId,dogId,parts,progress,available,onSaved}:{moduleId:string;householdId:string;dogId:string;parts:NonNullable<(typeof academyModules)[number]['subchallenges']>;progress:AcademySubchallengeProgress[];available:boolean;onSaved:()=>Promise<void>}){
 const completed=new Set(progress.map(part=>part.subchallenge_id)),firstOpen=parts.findIndex(part=>!completed.has(part.id))
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),operationIds=useRef(new Map<string,string>())
 async function complete(partId:string){
  if(busy)return;setBusy(true);setError('');setMessage('')
  let id=operationIds.current.get(partId);if(!id){id=crypto.randomUUID();operationIds.current.set(partId,id)}
  try{const result=await db().rpc('complete_academy_subchallenge',{p_household:householdId,p_dog:dogId,p_module:moduleId,p_subchallenge:partId,p_id:id});if(result.error)throw result.error;setMessage(result.data?'Part saved. Continue when your dog is ready.':'Your family has already saved this part.');await onSaved()}
  catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 return <section className="academy-parts-focus" aria-labelledby="academy-parts-title"><div className="academy-dashboard-heading"><div><p className="eyebrow">ONE PART AT A TIME</p><h2 id="academy-parts-title">Build up to the full trick</h2></div><span>{completed.size}/{parts.length} saved</span></div><progress className="academy-course-progress" value={completed.size} max={parts.length} aria-label={`${completed.size} of ${parts.length} parts saved`}/><p className="academy-soft-copy">Take breaks between parts. Your family can pick up from the last saved step.</p>{error&&<Notice error>{error}</Notice>}{message&&<Notice>{message}</Notice>}
  <ol className="academy-focused-parts">{parts.map((part,index)=>{const done=completed.has(part.id),active=available&&index===firstOpen;return <li key={part.id} className={done?'is-complete':active?'is-current':'is-locked'}><details open={active||!available&&index===0}><summary><span className="academy-part-number">{done?<Check size={16}/>:index+1}</span><span><strong>{part.title}</strong><small>{done?'Saved':active?'Practise this part':available?'Complete the previous part first':'Teaching guide'}</small></span>{!done&&!active&&available&&<LockKeyhole size={15}/>}</summary><div className="academy-part-content"><p>{part.objective}</p><ol>{part.steps.map(step=><li key={step}>{step}</li>)}</ol>{active&&<><p className="academy-practice-hint">Save this part when your dog can do it comfortably.</p><Button disabled={busy} onClick={()=>void complete(part.id)}>{busy?'Saving…':'Mark part complete'}</Button></>}</div></details></li>})}</ol><p className="academy-practice-hint">Parts save progress. Complete the final practice to achieve the challenge and earn XP once.</p>
 </section>
}

function PracticeEdit({record,householdId,dogId,onSaved}:{record:AcademyPractice;householdId:string;dogId:string;onSaved:()=>Promise<void>}){
 const [editing,setEditing]=useState(false)
 return editing?<PracticeForm key={record.id} moduleId={record.module_id} householdId={householdId} dogId={dogId} initialRecord={record} onSaved={async()=>{await onSaved();setEditing(false)}} onCancel={()=>setEditing(false)}/>:<Button className="secondary" onClick={()=>setEditing(true)}>Edit</Button>
}

function PracticeDelete({record,householdId,dogId,onDeleted}:{record:AcademyPractice;householdId:string;dogId:string;onDeleted:()=>Promise<void>}){
 const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function remove(){setBusy(true);setError('');try{const result=await db().rpc('save_academy_practice',{p_household:householdId,p_id:record.id,p_dog:dogId,p_module:record.module_id,p_checklist:record.checklist,p_performance:record.performance,p_completed:record.completed,p_delete:true});if(result.error)throw result.error;setConfirm(false);await onDeleted()}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 return <div className="academy-delete">{error&&<Notice error>{error}</Notice>}{confirm?<><Button className="secondary" disabled={busy} onClick={()=>void remove()}>{busy?'Removing…':'Confirm delete'}</Button><Button className="secondary" disabled={busy} onClick={()=>setConfirm(false)}>Keep</Button></>:<Button className="secondary" aria-label="Delete your practice record" onClick={()=>setConfirm(true)}><Trash2 size={15}/>Delete</Button>}</div>
}

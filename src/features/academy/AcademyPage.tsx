import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Award, BookOpen, Check, Flame, LockKeyhole, Sparkles, Trash2 } from 'lucide-react'
import { Button, LoadingPlaceholder, Notice, PageTitle, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
import type { AcademyModuleProgress, AcademyPractice, AcademySubchallengeProgress } from '../../lib/supabase/database.types'
import { useAuth } from '../auth/AuthProvider'
import { useHousehold } from '../household/HouseholdProvider'
import { academyCourses, academyModules, ACADEMY_RULES, isModuleUnlocked } from './catalog'
import { academyProgress } from './progress'

export function AcademyPage(){
 const {moduleId}=useParams();const {household,dog}=useHousehold();const {session}=useAuth()
 const [records,setRecords]=useState<AcademyPractice[]>([]),[milestones,setMilestones]=useState<AcademyModuleProgress[]>([]),[subchallengeProgress,setSubchallengeProgress]=useState<AcademySubchallengeProgress[]>([]),[names,setNames]=useState(new Map<string,string>()),[availableModuleIds,setAvailableModuleIds]=useState<Set<string>>(new Set())
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 const load=useCallback(async()=>{
  if(!household)return;setLoading(true);setError('')
  try{const [practice,progress,people,catalog]=await Promise.all([db().from('academy_practice').select('*').eq('household_id',household.id).is('deleted_at',null).order('practiced_at',{ascending:false}).limit(100),db().from('academy_module_progress').select('*').eq('household_id',household.id),db().rpc('get_household_members',{p_household:household.id}),db().from('academy_modules').select('id')]);if(practice.error)throw practice.error;if(progress.error)throw progress.error;if(people.error)throw people.error;if(catalog.error)throw catalog.error;const ids=new Set((catalog.data||[]).map(item=>item.id));setRecords(practice.data||[]);setMilestones(progress.data||[]);setNames(new Map((people.data||[]).map(person=>[person.user_id,person.display_name])));setAvailableModuleIds(ids);if(ids.has('stay')){const parts=await db().from('academy_subchallenge_progress').select('*').eq('household_id',household.id);if(parts.error)throw parts.error;setSubchallengeProgress(parts.data||[])}else setSubchallengeProgress([])}
  catch(e){setError(errorMessage(e))}finally{setLoading(false)}
 },[household?.id])
 useEffect(()=>{void load()},[load,retry])
 const progress=useMemo(()=>academyProgress(records,household?.timezone||'UTC',new Date(),milestones),[records,milestones,household?.timezone])
 const module=academyModules.find(item=>item.id===moduleId)
 if(module&&module.courseId!=='trick-training')return <Navigate to="/academy" replace/>
 if(moduleId&&!module)return <div className="academy-page"><PageTitle eyebrow="PAWSHARE ACADEMY" title="Challenge not found."/><Link className="text-link" to="/academy">Back to Academy</Link></div>
 if(loading)return <div className="academy-page"><PageTitle eyebrow="PAWSHARE ACADEMY" title={module?.title||'Teach a little, together.'}/><LoadingPlaceholder label="Loading Academy progress and challenge access" lines={3}/></div>
 if(error)return <div className="academy-page"><PageTitle eyebrow="PAWSHARE ACADEMY" title="Academy is temporarily unavailable.">Your lessons and progress are still safe. Try again after the database connection is ready.</PageTitle><Notice error>{error}</Notice><Button className="secondary" onClick={()=>setRetry(value=>value+1)}>Try again</Button><p><Link className="text-link" to="/more">Back to More</Link></p></div>
 if(module&&availableModuleIds.has(module.id)&&!isModuleUnlocked(module,progress.completedIds))return <div className="academy-page"><PageTitle eyebrow="PAWSHARE ACADEMY" title="A little more practice first.">Complete the previous challenge together to unlock this one.</PageTitle><Link className="text-link" to="/academy">Back to Academy</Link></div>
 return <div className="academy-page">
  {module?<><Link className="academy-back" to="/academy"><ArrowLeft size={16}/>All challenges</Link><PageTitle eyebrow={`${module.courseTitle.toUpperCase()} · COURSE LEVEL ${module.level} · CHALLENGE ${module.position}`} title={module.title}>{module.objective}</PageTitle>
   <article className="card academy-lesson-card"><p className="academy-meta"><BookOpen size={16}/>{module.subchallenges?.length?(availableModuleIds.has(module.id)?'Short sessions · progress saves as you go':'Short sessions · guided steps'): `About ${module.estimatedMinutes} minutes`}</p>
    {!availableModuleIds.has(module.id)&&<Notice>Preview only: this challenge is not in the shared database yet, so practice and progress cannot be saved until Laura applies the reviewed Academy migration.</Notice>}
    {!module.subchallenges?.length&&<section className="academy-visual" aria-label="Challenge steps"><h2>Three small steps</h2><ol>{module.visualSteps.map((step,index)=><li key={step.title}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{step.title}</strong><p>{step.text}</p></div></li>)}</ol></section>}
    {(module.subchallenges?module.sections.slice(0,1):module.sections).map(section=><section className="academy-lesson-section" key={section.heading}><h2>{section.heading}</h2><p>{section.text}</p></section>)}
    {module.subchallenges?.length? <SubchallengePath moduleId={module.id} householdId={household!.id} dogId={dog!.id} parts={module.subchallenges} progress={subchallengeProgress.filter(part=>part.module_id===module.id&&part.dog_id===dog!.id)} available={availableModuleIds.has(module.id)} onSaved={load}/>:null}
    {availableModuleIds.has(module.id)&&(!module.subchallenges?.length||module.subchallenges.every(part=>subchallengeProgress.some(saved=>saved.module_id===module.id&&saved.dog_id===dog!.id&&saved.subchallenge_id===part.id)))&&<section className="academy-try"><h2>{module.subchallenges?.length?'Challenge complete':'Try it together'}</h2><p>{module.subchallenges?.length?`All parts are done. Record the final practice to earn ${ACADEMY_RULES.xpPerModule} shared XP once for the household.`:`Save what you practised. Completing this challenge earns ${ACADEMY_RULES.xpPerModule} shared XP once for the household.`}</p><PracticeForm key={module.id} moduleId={module.id} householdId={household!.id} dogId={dog!.id} onSaved={load}/></section>}
    <details className="academy-check"><summary>Training reminder</summary><h3>{module.question}</h3><p><strong>{module.answer}</strong></p><p>{module.feedback}</p></details>
    {module.sources.length>0&&<aside className="academy-sources"><h2>Learn more</h2><ul>{module.sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} <ArrowUpRight size={14}/></a></li>)}</ul></aside>}
   </article>
   <section className="card academy-history"><h2>Family practice notes</h2>{loading?<p role="status">Loading practice…</p>:records.filter(record=>record.module_id===module.id).length===0?<p className="muted">No practice saved for this challenge yet.</p>:<ul className="academy-practice-list">{records.filter(record=>record.module_id===module.id).map(record=><li key={record.id}><div><strong>{record.completed?'Challenge achieved':'Practice attempt'} · {record.user_id===session?.user.id?'you':names.get(record.user_id||'')||'Former family member'}</strong><small>{new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short',timeZone:household!.timezone,hour12:false}).format(new Date(record.practiced_at))}</small>{record.performance&&<p>{record.performance}</p>}</div>{record.user_id===session?.user.id&&<div className="academy-own-actions"><PracticeEdit record={record} householdId={household!.id} dogId={dog!.id} onSaved={load}/><PracticeDelete record={record} householdId={household!.id} dogId={dog!.id} onDeleted={load}/></div>}</li>)}</ul>}</section>
  </>:<>
   <PageTitle eyebrow="PAWSHARE ACADEMY" title="Teach a little, together.">Teach {dog?.name} a new trick, one short challenge at a time. Practice and progress are shared with your household.</PageTitle>
   <><section className="academy-progress-grid"><div className="card academy-progress-card"><Sparkles/><strong>{progress.xp}</strong><span>shared XP · level {progress.level}</span></div><div className="card academy-progress-card"><Flame/><strong>{progress.streak}</strong><span>day family practice streak</span></div><div className="card academy-progress-card"><Award/><strong>{progress.completedCount}</strong><span>Academy wins</span></div></section>
    {progress.badges.length>0&&<p className="academy-badges" aria-label="Earned badges">{progress.badges.map(badge=><span key={badge}><Award size={15}/>{badge}</span>)}</p>}
   </>
   {progress.nextModule&&<section className="card academy-resume"><div><p className="eyebrow">YOUR NEXT SMALL STEP</p><h2>{progress.nextModule.title}</h2><p>{progress.nextModule.objective}</p></div><Link className="button" to={`/academy/${progress.nextModule.id}`}>{availableModuleIds.has(progress.nextModule.id)?'Continue challenge':'Preview challenge'} <ArrowUpRight size={16}/></Link></section>}
   {academyCourses.map(course=>{const completedCount=course.modules.filter(item=>progress.completedIds.has(item.id)).length;const noun=course.id==='trick-training'?'CHALLENGES':'LESSONS';return <section className="academy-course" key={course.id}>
    <div className="academy-course-heading"><div><p className="eyebrow">{course.modules.length} SHORT {noun} · COURSE LEVELS {course.modules[0].level}–{course.modules.at(-1)!.level}</p><h2>{course.title}</h2><p>{course.description}</p><progress className="academy-course-progress" value={completedCount} max={course.modules.length} aria-label={`${course.title}: ${completedCount} of ${course.modules.length} ${noun.toLowerCase()} complete`}/></div><span>{completedCount}/{course.modules.length} complete</span></div>
    <ol className="academy-path">{course.modules.map(item=>{const available=availableModuleIds.has(item.id);const unlocked=isModuleUnlocked(item,progress.completedIds);const complete=progress.completedIds.has(item.id);const current=available&&unlocked&&!complete;return <li className={`academy-path-item ${complete?'is-complete':''} ${current?'is-current':''} ${!unlocked?'is-locked':''} ${!available?'is-unavailable':''}`} key={item.id}>
     <span className="academy-path-node" aria-hidden="true">{complete?<Check size={19}/>:!available||!unlocked?<LockKeyhole size={17}/>:<BookOpen size={18}/>}</span><article className="card academy-module"><div className="academy-module-top"><span>{course.id==='trick-training'?'CHALLENGE':'LESSON'} {item.position} · COURSE LEVEL {item.level}</span><span>{!available?'Preview':complete?'Complete':current?'Up next':'Locked'}</span></div><h3>{item.title}</h3><p>{item.objective}</p>{unlocked||!available?<Link className="text-link" to={`/academy/${item.id}`}>{available?complete?'Review challenge':'Start challenge':'Preview challenge'} <ArrowUpRight size={16}/></Link>:<p className="muted">Complete the previous challenge to unlock this one.</p>}</article>
    </li>})}</ol>
   </section>})}
   <p className="academy-rules-note">Shared progress follows the family time zone. XP is awarded once per challenge; practice notes remain attributed to the person who saved them.</p>
  </>}
 </div>
}

function PracticeForm({moduleId,householdId,dogId,onSaved,initialRecord,onCancel}:{moduleId:string;householdId:string;dogId:string;onSaved:()=>Promise<void>;initialRecord?:AcademyPractice;onCancel?:()=>void}){
 const module=academyModules.find(item=>item.id===moduleId)!;const [checklist,setChecklist]=useState<Record<string,boolean>>(()=>initialRecord?.checklist||{});const [performance,setPerformance]=useState(initialRecord?.performance||'');const [completed,setCompleted]=useState(initialRecord?.completed||false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');const [operationId,setOperationId]=useState(()=>initialRecord?.id||crypto.randomUUID())
 async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');setMessage('')
  if(completed&&!module.checklist.every((_,index)=>checklist[String(index)])){setError('Complete each practice step before marking this challenge achieved.');setBusy(false);return}
  try{const result=await db().rpc('save_academy_practice',{p_household:householdId,p_id:operationId,p_dog:dogId,p_module:moduleId,p_checklist:checklist,p_performance:performance,p_completed:completed});if(result.error)throw result.error;setMessage(initialRecord?'Your practice note was updated.':'Practice saved to your family’s learning journey.');if(!initialRecord){setChecklist({});setPerformance('');setCompleted(false);setOperationId(crypto.randomUUID())}await onSaved()}
  catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 return <form className="academy-practice-form" onSubmit={save}>{error&&<Notice error>{error}</Notice>}{message&&<Notice>{message}</Notice>}
  <fieldset disabled={busy}><legend>Steps to practise</legend>{module.checklist.map((item,index)=><label className="academy-check-row" key={item}><input type="checkbox" checked={!!checklist[String(index)]} onChange={e=>setChecklist({...checklist,[String(index)]:e.target.checked})}/><span>{item}</span></label>)}
   <label className="field">How did it go? (optional)<textarea maxLength={1200} rows={3} value={performance} onChange={e=>setPerformance(e.target.value)} placeholder="Share a short note with your family."/></label>
   <label className="academy-complete-row"><input type="checkbox" checked={completed} disabled={initialRecord?.completed} onChange={e=>setCompleted(e.target.checked)}/><span>{initialRecord?.completed?'Challenge completion is part of shared family progress':'Mark this challenge achieved for our dog'}</span></label>
   <Button disabled={busy}>{busy?'Saving…':initialRecord?'Save changes':'Save practice'}</Button>{onCancel&&<Button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancel</Button>}
  </fieldset>
 </form>
}

function SubchallengePath({moduleId,householdId,dogId,parts,progress,available,onSaved}:{moduleId:string;householdId:string;dogId:string;parts:NonNullable<(typeof academyModules)[number]['subchallenges']>;progress:AcademySubchallengeProgress[];available:boolean;onSaved:()=>Promise<void>}){
 const completed=new Set(progress.map(part=>part.subchallenge_id));const firstOpen=parts.findIndex(part=>!completed.has(part.id));const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 async function complete(partId:string){setBusy(true);setError('');setMessage('');try{const result=await db().rpc('complete_academy_subchallenge',{p_household:householdId,p_dog:dogId,p_module:moduleId,p_subchallenge:partId,p_id:crypto.randomUUID()});if(result.error)throw result.error;setMessage(result.data?'Part saved to your family’s progress. No XP is awarded until the full challenge is complete.':'Your family has already completed this part.');await onSaved()}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 return <section className="academy-subchallenge-path" aria-labelledby="academy-parts-title">
  <div className="academy-subchallenge-heading"><div><p className="eyebrow">STEP-BY-STEP TRAINING</p><h2 id="academy-parts-title">Practise one part at a time</h2><p>{available?'Each part builds on the last. Pause when your dog needs a break; your family can continue from the last completed part.':'Each part builds on the last. Follow the steps at your dog’s pace and pause whenever they need a break.'}</p></div><strong>{available?`${completed.size}/${parts.length} complete`:`${parts.length} guided parts`}</strong></div>
  {available&&<progress className="academy-course-progress" value={completed.size} max={parts.length} aria-label={`${completed.size} of ${parts.length} parts complete`}/>}
  {error&&<Notice error>{error}</Notice>}{message&&<Notice>{message}</Notice>}
  <ol className="academy-subchallenge-list">{parts.map((part,index)=>{const done=completed.has(part.id),unlocked=available&&firstOpen===index;return <li className={`academy-subchallenge ${done?'is-complete':''}`} key={part.id}>
   <div className="academy-subchallenge-top"><span>PART {index+1} OF {parts.length}</span><span>{done?'Done':!available?'Preview':unlocked?'Ready':'Locked'}</span></div>
   <h3>{part.title}</h3><p>{part.objective}</p><ol>{part.steps.map((step,stepIndex)=><li key={step}>{stepIndex+1}. {step}</li>)}</ol>
   {done?<p className="academy-subchallenge-status"><Check size={16}/> Saved for your household</p>:unlocked?<Button disabled={busy} onClick={()=>void complete(part.id)}>{busy?'Saving…':'Mark part complete'}</Button>:available?<p className="muted">Complete the previous part to continue.</p>:null}
  </li>})}</ol>
  <p className="academy-rules-note">{available?'Completing a part saves learning progress but does not award XP. XP is earned once when the full challenge is achieved.':'Part progress will be saved without XP once setup is complete. XP is earned once when the full challenge is achieved.'}</p>
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

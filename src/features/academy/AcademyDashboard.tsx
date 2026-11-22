import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight,BookOpen,Check,ChevronDown,Clock,Dog,Flame,GraduationCap,LockKeyhole,Sparkles } from 'lucide-react'
import type { AcademyPractice,AcademySubchallengeProgress } from '../../lib/supabase/database.types'
import { trainingJourney } from './journey'
import { isModuleUnlocked } from './catalog'

type Props={dogName:string;completedIds:ReadonlySet<string>;records:AcademyPractice[];parts:AcademySubchallengeProgress[];available:ReadonlySet<string>;names:Map<string,string>;xp:number;level:number;streak:number;zone:string}
export function AcademyDashboard({dogName,completedIds,records,parts,available,names,xp,level,streak,zone}:Props){
 const journey=trainingJourney(completedIds,records,parts)
 const [stageId,setStageId]=useState<string>(journey.currentStage.id),[browse,setBrowse]=useState(false)
 const stage=journey.stages.find(item=>item.id===stageId)||journey.currentStage
 const recent=records.find(record=>journey.modules.some(module=>module.id===record.module_id)&&!record.deleted_at)
 const recentModule=journey.modules.find(module=>module.id===recent?.module_id)
 const next=journey.next,ready=!!next&&available.has(next.id),started=journey.practiced||journey.partsDone>0
 return <>
  <section className="card academy-next-card" aria-labelledby="academy-next-title">
   <div className="academy-next-copy"><p className="eyebrow">{next?started?'PICK UP WHERE YOU LEFT OFF':'YOUR NEXT CHALLENGE':'A JOURNEY WORTH CELEBRATING'}</p><h2 id="academy-next-title">{next?next.title:`Look how far ${dogName} has come.`}</h2><p>{next?next.objective:'All eleven challenges achieved. Keep favourite tricks fresh with a short, relaxed practice.'}</p>
    {next&&<div className="academy-session-meta"><span><Clock size={15}/>{next.estimatedMinutes} min</span><span><BookOpen size={15}/>{next.subchallenges?`${journey.partsDone} of ${next.subchallenges.length} parts saved`:`Challenge ${next.position} of ${journey.modules.length}`}</span></div>}
    {next?.subchallenges&&<progress value={journey.partsDone} max={next.subchallenges.length} aria-label={`${journey.partsDone} of ${next.subchallenges.length} challenge parts saved`}/>}
    {journey.nextPart&&<p className="academy-next-part">Up next: {journey.nextPart.title}</p>}
    <Link className="button" to={`/academy/${next?.id||journey.modules.at(-1)!.id}`}>{next?ready?started?'Continue challenge':'Start challenge':'Read challenge':'Practise a favourite'}<ArrowRight size={17}/></Link>
   </div><div className="academy-next-illustration" aria-hidden="true"><Dog size={96} strokeWidth={1.25}/><span>{dogName}’s learning journey</span></div>
  </section>
  <section className="academy-journey" aria-labelledby="academy-path-title"><div className="academy-dashboard-heading"><h2 id="academy-path-title">Your learning path</h2><span>{journey.done}/{journey.modules.length} challenges achieved</span></div><div className="academy-stage-track">{journey.stages.map(item=><button type="button" key={item.id} className={`academy-stage ${item.complete?'is-complete':''} ${item.current?'is-current':''} ${!item.complete&&!item.current?'is-locked':''}`} aria-pressed={stageId===item.id} aria-label={`${item.title}: ${item.done} of ${item.modules.length} complete${item.current?', current stage':''}`} onClick={()=>{setStageId(item.id);setBrowse(true)}}><span className="academy-stage-icon">{item.complete?<Check size={19}/>:item.current?<Dog size={20}/>:<LockKeyhole size={17}/>}</span><span><strong>{item.title}</strong><small>{item.complete?'Complete':item.current?'Current':`${item.modules.length} challenges ahead`}</small></span></button>)}</div>
   <details className="academy-browse" open={browse} onToggle={event=>setBrowse(event.currentTarget.open)}><summary>Explore the challenges <ChevronDown size={16}/></summary><div className="card academy-stage-lessons"><div><h3>{stage.title}</h3><p>{stage.description}</p></div><ol>{stage.modules.map(module=>{const done=completedIds.has(module.id),unlocked=isModuleUnlocked(module,completedIds),exists=available.has(module.id);return <li key={module.id} className={!unlocked?'is-locked':undefined}><span className={`academy-lesson-number ${done?'is-complete':''}`}>{done?<Check size={15}/>:module.position}</span><div><strong>{module.title}</strong><small>{module.estimatedMinutes} min · {module.subchallenges?`${module.subchallenges.length} guided parts`:'A short practical exercise'}</small></div>{unlocked?<Link to={`/academy/${module.id}`} aria-label={`${done?'Review':exists?'Start':'Read'} ${module.title}`}>{done?'Review':exists?'Start':'Read'}<ArrowRight size={15}/></Link>:<span className="academy-lesson-locked"><LockKeyhole size={15}/><span className="sr-only">Complete the previous challenge first</span></span>}</li>})}</ol></div></details>
  </section>
  <div className="academy-dashboard-grid"><section className="card academy-practice-today"><div className="academy-dashboard-heading"><h2>Practice today</h2></div><p className="academy-soft-copy">A few calm minutes. Finish while {dogName} is still enjoying it.</p>{journey.practiceAgain.length?journey.practiceAgain.map(module=><div className="academy-practice-suggestion" key={module.id}><span className="academy-practice-icon"><Dog size={22}/></span><div><h3>{module.title}</h3><p>Revisit a skill you’ve achieved together.</p></div><Link className="button secondary" to={`/academy/${module.id}`}>Practise</Link></div>):<div className="academy-first-practice"><BookOpen size={21}/><div><strong>Start with one small win</strong><p>Your first challenge is ready above. There’s no need to rush.</p></div></div>}</section>
   <section className="card academy-household-progress"><h2>Household progress</h2><div className="academy-progress-tiles"><div><Flame size={22}/><span><strong>{streak} {streak===1?'day':'days'}</strong><small>shared practice streak</small></span></div><div><GraduationCap size={24}/><span><strong>{xp} XP</strong><small>household level {level}</small></span></div></div>
    <div className="academy-recent-activity"><Clock size={19}/><div><h3>Recent activity</h3>{recent&&recentModule?<><p>{names.get(recent.user_id||'')||'A family member'} practised {recentModule.title.toLowerCase()}.</p><small>{new Intl.DateTimeFormat('en-GB',{timeZone:zone,dateStyle:'medium',timeStyle:'short',hourCycle:'h23'}).format(new Date(recent.practiced_at))}</small></>:<p>Your family’s saved practice will appear here.</p>}</div></div>
    {journey.stages.some(item=>item.complete)&&<div className="academy-earned-milestones" aria-label="Training milestones">{journey.stages.filter(item=>item.complete).map(item=><span key={item.id}><Check size={14}/>{item.title} achieved</span>)}</div>}
   </section></div>
  <p className="academy-dashboard-note"><Sparkles size={14}/>Progress belongs to your dog and household. Each challenge earns XP once.</p>
 </>
}

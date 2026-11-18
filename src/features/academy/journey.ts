import type { AcademyPractice,AcademySubchallengeProgress } from '../../lib/supabase/database.types'
import { academyCourses,type AcademyModule } from './catalog'
export const trainingStages=[
 {id:'foundations',title:'First cues',description:'Build a shared language.',from:1,to:3},
 {id:'playful',title:'Playful tricks',description:'Small wins, paws and turns.',from:4,to:7},
 {id:'combinations',title:'Build on your skills',description:'Practise more complex tricks in parts.',from:8,to:11},
] as const
export function trainingJourney(completed:ReadonlySet<string>,records:AcademyPractice[],parts:AcademySubchallengeProgress[]) {
 const modules=academyCourses[0].modules
 const next=modules.find(module=>!completed.has(module.id))
 const stages=trainingStages.map(stage=>{
  const lessons=modules.filter(module=>module.position>=stage.from&&module.position<=stage.to)
  const done=lessons.filter(module=>completed.has(module.id)).length
  return {...stage,modules:lessons,done,complete:done===lessons.length,current:!!next&&next.position>=stage.from&&next.position<=stage.to}
 })
 const currentStage=stages.find(stage=>stage.current)||stages[stages.length-1]
 const nextParts=next?.subchallenges||[]
 const nextPart=nextParts.find(part=>!parts.some(saved=>saved.module_id===next!.id&&saved.subchallenge_id===part.id))
 const practiced=!!next&&records.some(record=>!record.deleted_at&&record.module_id===next.id)
 const practiceAgain:AcademyModule[]=modules.filter(module=>completed.has(module.id)).reverse().slice(0,2)
 return {modules,next,stages,currentStage,practiced,nextPart,partsDone:nextParts.length-(nextParts.filter(part=>!parts.some(saved=>saved.module_id===next!.id&&saved.subchallenge_id===part.id)).length),practiceAgain,done:modules.filter(module=>completed.has(module.id)).length}
}

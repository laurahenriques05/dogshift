import { db } from '../../lib/supabase/client'

export type AcademyPracticeDate = {practiced_at:string}

/** Streak input is independent of the compact recent-practice history. */
export async function loadAcademyPracticeDates(householdId:string):Promise<AcademyPracticeDate[]> {
 const dates:AcademyPracticeDate[]=[]
 for(let from=0;;from+=500){
  const result=await db().from('academy_practice').select('id,practiced_at')
   .eq('household_id',householdId).is('deleted_at',null)
   .order('id').range(from,from+499)
  if(result.error)throw result.error
  dates.push(...(result.data||[]).map(row=>({practiced_at:row.practiced_at})))
  if((result.data||[]).length<500)return dates
 }
}

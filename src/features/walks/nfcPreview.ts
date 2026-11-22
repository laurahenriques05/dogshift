import type { DailySlot } from './dailyWalks'
import { nextRoutineSlot } from './routinePresentation'
import { minutesOf, routineOrder, routinePeriod } from './routineSchedule'
const titleFor=(name:string)=>name.replace(/^(Morning|Afternoon|Night)(.*)$/,'$1 Walk$2')
export function nfcWalkPreview(routine:{ready:boolean;count?:number;scheduleComplete:boolean;slots:DailySlot[];times:string[];names:string[]},now=new Date(),zone='UTC') {
 const clock=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now)
 const period=routinePeriod(clock)!,minute=minutesOf(clock)!
 const fallback={title:`${period} Walk`,time:null}
 if(!routine.ready||routine.count===undefined||!routine.scheduleComplete)return fallback
 const ordered=routineOrder(routine.times).flatMap(index=>routine.slots.filter(slot=>slot.number===index+1))
 const next=nextRoutineSlot(ordered)
 if(next){const name=routine.names[next.number-1];return {title:name?titleFor(name):fallback.title,time:routine.times[next.number-1]||null}}
 // An additional outing still belongs to its local period; never invent a next-day plan.
 const distance=(time:string)=>{const difference=Math.abs(minutesOf(time)!-minute);return Math.min(difference,1440-difference)}
 const index=routine.times.map((time,index)=>({time,index})).filter(item=>routinePeriod(item.time)===period).sort((a,b)=>distance(a.time)-distance(b.time)||a.index-b.index)[0]?.index
 return index===undefined?fallback:{title:titleFor(routine.names[index]||period),time:routine.times[index]}
}

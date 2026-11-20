const timePattern=/^([01]\d|2[0-3]):[0-5]\d$/
export const validRoutineTimes=(times:string[],count:number)=>times.length===count&&count>=1&&count<=12&&times.every(time=>timePattern.test(time))
export function minutesOf(time:string){return timePattern.test(time)?Number(time.slice(0,2))*60+Number(time.slice(3)):null}
export function routinePeriod(time:string):'Morning'|'Afternoon'|'Night'|null{
 const minute=minutesOf(time)
 return minute===null?null:minute>=1200||minute<420?'Night':minute>=720?'Afternoon':'Morning'
}
/** Names describe estimated routine periods, never actual outing deadlines. */
export function routineNames(times:string[]):string[]{
 const periods=times.map(routinePeriod)
 return times.map((_,index)=>{
  const period=periods[index];if(!period)return ''
  const group=times.map((_,i)=>i).filter(i=>periods[i]===period)
  return `${period}${group.length>1?` ${group.indexOf(index)+1}`:''}`
 })
}

/** Keep periods together; new outings append within their period; blank estimates stay unnamed. */
export function routineOrder(times:string[]){
 const rank={Morning:0,Afternoon:1,Night:2}
 return times.map((time,index)=>({index,period:routinePeriod(time)})).sort((a,b)=>(a.period?rank[a.period]:3)-(b.period?rank[b.period]:3)||a.index-b.index).map(item=>item.index)
}

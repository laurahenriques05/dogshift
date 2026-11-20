const timePattern=/^([01]\d|2[0-3]):[0-5]\d$/
export const validRoutineTimes=(times:string[],count:number)=>times.length===count&&count>=1&&count<=12&&times.every(time=>timePattern.test(time))
export function minutesOf(time:string){return timePattern.test(time)?Number(time.slice(0,2))*60+Number(time.slice(3)):null}
export function routinePeriod(time:string){
 const minute=minutesOf(time)
 return minute===null?null:minute>=1200||minute<420?'Night':minute>=720?'Afternoon':'Morning'
}
/** Names describe estimated routine periods, never actual outing deadlines. */
export function routineNames(times:string[]):string[]{
 const periods=times.map(routinePeriod)
 return times.map((_,index)=>{
  const period=periods[index];if(!period)return ''
  const group=times.map((time,i)=>({minute:minutesOf(time)!,i})).filter(item=>periods[item.i]===period).sort((a,b)=>a.minute-b.minute||a.i-b.i)
  return `${period}${group.length>1?` ${group.findIndex(item=>item.i===index)+1}`:''}`
 })
}

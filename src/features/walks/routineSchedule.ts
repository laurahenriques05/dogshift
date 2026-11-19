import { localDay } from './gps'
export type RoutinePlace={latitude:number;longitude:number;label:string}
const timePattern=/^([01]\d|2[0-3]):[0-5]\d$/
export const validRoutineTimes=(times:string[],count:number)=>times.length===count&&count>=1&&count<=12&&times.every(time=>timePattern.test(time))
export function minutesOf(time:string){return timePattern.test(time)?Number(time.slice(0,2))*60+Number(time.slice(3)):null}
/** NOAA fractional-year sunrise estimate. Local calculation, no location sent to a solar API.
 * https://gml.noaa.gov/grad/solcalc/solareqns.PDF */
export function sunriseMinutes(day:string,zone:string,place:RoutinePlace):number|null{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(place.latitude)||!Number.isFinite(place.longitude)||Math.abs(place.latitude)>90||Math.abs(place.longitude)>180)return null
 const date=Date.parse(`${day}T12:00:00Z`);if(!Number.isFinite(date))return null
 const rad=Math.PI/180
 for(const shift of [-1,0,1]){
  const noon=new Date(date+shift*86400000),year=noon.getUTCFullYear(),days=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000
  const n=Math.floor((noon.getTime()-Date.UTC(year,0,1))/86400000)+1,gamma=2*Math.PI/days*(n-1)
  const eq=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma))
  const decl=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)-.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)-.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma)
  const cos=Math.cos(90.833*rad)/(Math.cos(place.latitude*rad)*Math.cos(decl))-Math.tan(place.latitude*rad)*Math.tan(decl)
  if(cos>1||cos< -1)continue // Polar day/night: do not invent a sunrise.
  const utcMinutes=720-4*(place.longitude+Math.acos(cos)/rad)-eq
  const instant=new Date(Date.UTC(year,noon.getUTCMonth(),noon.getUTCDate())+utcMinutes*60000)
  if(localDay(instant.toISOString(),zone)!==day)continue
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant)
  return Number(parts.find(p=>p.type==='hour')?.value)*60+Number(parts.find(p=>p.type==='minute')?.value)
 }
 return null
}
export function routineNames(times:string[],sunrise:number|null):string[]{
 const periods=times.map(time=>{const minute=minutesOf(time);return minute===null?null:minute>=1200?'Night':minute>=720?'Afternoon':sunrise===null?null:minute>=sunrise?'Morning':'Night'})
 return times.map((_,index)=>{
  const period=periods[index];if(!period)return `Walk ${index+1}`
  const group=times.map((time,i)=>({minute:minutesOf(time)!,i})).filter(item=>periods[item.i]===period).sort((a,b)=>a.minute-b.minute||a.i-b.i)
  return `${period} Walk${group.length>1?` ${group.findIndex(item=>item.i===index)+1}`:''}`
 })
}

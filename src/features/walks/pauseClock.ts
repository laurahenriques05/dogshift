export type WalkPause={start:string;end:string|null}
export function validPauses(value:unknown):value is WalkPause[]{
 if(!Array.isArray(value)||value.length>1000)return false
 let previous=-Infinity
 return value.every((pause,index)=>{
  if(!pause||typeof pause.start!=='string'||(pause.end!==null&&typeof pause.end!=='string')||!Number.isFinite(Date.parse(pause.start))||(pause.end!==null&&!Number.isFinite(Date.parse(pause.end))))return false
  const start=Date.parse(pause.start),end=pause.end===null?Infinity:Date.parse(pause.end)
  if(start<previous||end<start||(end===Infinity&&index!==value.length-1))return false
  previous=end;return true
 })
}
export function pausedSeconds(pauses:WalkPause[],start:number,end:number){
 return pauses.reduce((total,pause)=>total+Math.max(0,Math.min(end,pause.end===null?end:Date.parse(pause.end))-Math.max(start,Date.parse(pause.start)))/1000,0)
}
export function closePause(pauses:WalkPause[],at:string):WalkPause[]{return pauses.map(pause=>pause.end===null?{...pause,end:at}:pause)}

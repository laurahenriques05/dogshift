export type GpsQuality='waiting'|'good'|'weak'|'denied'|'unavailable'
export function recordingStatus(input:{gps:boolean;tracking:boolean;paused:boolean;quality:GpsQuality;accuracy:number|null;lastFix:number|null;pending:number;ending:boolean;online:boolean;saved:boolean;now:number}){
 const fresh=input.lastFix!==null&&input.now-input.lastFix<30000
 const gps=!input.gps?'Time only':input.paused?'GPS paused':input.quality==='denied'?'Location blocked':!input.tracking?'Resume GPS':input.quality==='good'&&fresh?`GPS ±${Math.round(input.accuracy??0)} m`:input.quality==='weak'?'Weak GPS':input.quality==='unavailable'?'GPS unavailable':'Finding GPS'
 const saving=input.ending?'Finishing…':input.pending>0?input.online?'Saving…':`Offline · ${input.pending} points pending`:!input.gps?'Timer running':input.saved?'Saved':'Waiting for GPS'
 const footer=!input.gps?'Your walk will be saved when you finish.':input.pending>0?input.online?'Saving your route…':'Your route will sync when you reconnect.':input.saved?'Your route is saved as you walk.':'GPS points save automatically when available.'
 return {gps,saving,footer}
}

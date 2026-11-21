import type { CalendarEvent } from './model'

export const calendarTopics = [
 {id:'all',label:'All'},
 {id:'feeding',label:'Feeding'},
 {id:'walk',label:'Walks'},
 {id:'health',label:'Health'},
 {id:'other',label:'Other'},
] as const
export type CalendarTopic = (typeof calendarTopics)[number]['id']
export function calendarTopic(event:CalendarEvent):Exclude<CalendarTopic,'all'> {
 if(event.source==='health')return 'health'
 if(event.source==='feeding')return 'feeding'
 if(event.source==='walk')return 'walk'
 return event.careKind||event.category||'other'
}
export function calendarEventLabel(event:CalendarEvent):string {
 if(event.source==='task')return 'Task'
 if(event.eventKind==='meal-routine'||event.eventKind==='walk-routine')return 'Routine'
 if(event.source==='feeding')return event.eventKind==='meal'?'Meal':'Food restocking'
 if(event.source==='walk')return 'Walk'
 return event.eventKind==='appointment'?'Appointment':event.eventKind==='vaccination'?'Vaccination':event.eventKind==='medication'?'Medication':'Health record'
}
export function matchesCalendarTopic(event:CalendarEvent,topic:CalendarTopic){
 return topic==='all'||calendarTopic(event)===topic
}

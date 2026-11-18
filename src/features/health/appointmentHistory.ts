import type { AppointmentType, VetAppointment } from '../../lib/supabase/database.types'
import { localTime } from './time'
export const appointmentTypes: {value:AppointmentType;label:string}[] = [
 {value:'uncategorised',label:'Uncategorised'}, {value:'consultation',label:'Veterinary consultation'},
 {value:'vaccination',label:'Vaccination visit'}, {value:'examination',label:'Examination / tests'},
 {value:'surgery',label:'Surgery / procedure'}, {value:'other',label:'Other'}
]
export type HistoryFilters = {query:string;type:string;from:string;to:string}
export function filterAppointmentHistory(rows:VetAppointment[], zone:string, now:number, filters:HistoryFilters) {
 const query=filters.query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 return rows.filter(row=>{
  if(Date.parse(row.starts_at)>=now) return false
  const day=localTime(row.starts_at,zone).slice(0,10)
  const text=[row.title,row.location,row.notes].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  return (!query||text.includes(query))&&(!filters.type||(row.appointment_type||'uncategorised')===filters.type)&&(!filters.from||day>=filters.from)&&(!filters.to||day<=filters.to)
 }).sort((a,b)=>Date.parse(b.starts_at)-Date.parse(a.starts_at)||a.id.localeCompare(b.id))
}

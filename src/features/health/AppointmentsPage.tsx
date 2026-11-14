import { Syringe, Pill, FolderHeart, Stethoscope, Phone, Activity, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Button, Field, Notice, PageTitle, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
import type { VetAppointment, Vaccination } from '../../lib/supabase/database.types'
import { useHousehold } from '../household/HouseholdProvider'
import { localTime, toInstant } from './time'
export function AppointmentsPage() {
 const { household, membership } = useHousehold()
 return household && membership ? <Appointments key={household.id} id={household.id} zone={household.timezone}/> : <Notice error>Access denied. Current family membership is required.</Notice>
}
function Appointments({ id, zone }: { id: string; zone: string }) {
 const today=localTime(new Date().toISOString(),zone).slice(0,10)
 const [formOpen,setFormOpen]=useState(false)
 const [rows,setRows]=useState<VetAppointment[]>([]), [loading,setLoading]=useState(true), [error,setError]=useState(''), [retry,setRetry]=useState(0)
 const [vaccinations,setVaccinations]=useState<Vaccination[]>([]),[vaccineError,setVaccineError]=useState('')
 const [deleting,setDeleting]=useState<VetAppointment|null>(null),[deleteError,setDeleteError]=useState(''),[deleted,setDeleted]=useState(false)
 const [editing,setEditing]=useState<VetAppointment|null>(null), [title,setTitle]=useState(''), [time,setTime]=useState(''), [location,setLocation]=useState(''), [notes,setNotes]=useState(''), [saving,setSaving]=useState(false), [saveError,setSaveError]=useState(''), [saved,setSaved]=useState(false)
 useEffect(()=>{let active=true;setLoading(true);setError('');setRows([]);setVaccinations([]);setVaccineError('')
 async function load(){try{
 const member=await db().from('households').select('id').eq('id',id).maybeSingle()
 if(member.error) throw member.error
 if(!member.data) throw new Error('Access denied. You are no longer a member of this family.')
 const result=await db().from('vet_appointments').select('*').eq('household_id',id).order('starts_at')
 if(result.error) throw result.error
 if(active)setRows(result.data)
 const vaccines=await db().from('vaccinations').select('*').eq('household_id',id).not('next_due_on','is',null)
 if(active){if(vaccines.error)setVaccineError(vaccines.error.message);else setVaccinations(vaccines.data)}
 }catch(e){if(active)setError(errorMessage(e))}finally{if(active)setLoading(false)}}
 void load();return()=>{active=false}
 },[id,retry])
 function reset(){setEditing(null);setTitle('');setTime('');setLocation('');setNotes('');setSaveError('')}
 async function save(event:React.FormEvent){event.preventDefault();setSaving(true);setSaveError('');setSaved(false)
 try{if(!title.trim()||title.trim().length>120)throw new Error('Enter a title of 1–120 characters.')
 const values={title:title.trim(),starts_at:toInstant(time,zone),location:location.trim(),notes:notes.trim()}
 const result=editing ? await db().from('vet_appointments').update(values).eq('household_id',id).eq('id',editing.id).select().single() : await db().from('vet_appointments').insert({...values,household_id:id}).select().single()
 if(result.error)throw result.error
 reset();setFormOpen(false);setSaved(true);setRetry(v=>v+1)
 }catch(e){setSaveError(errorMessage(e))}finally{setSaving(false)}}
 async function removeAppointment(){if(!deleting)return;setSaving(true);setDeleteError('');setSaved(false);setDeleted(false)
 try{const result=await db().from('vet_appointments').delete().eq('household_id',id).eq('id',deleting.id).select('id').single();if(result.error)throw result.error
 if(editing?.id===deleting.id){reset();setFormOpen(false)}setDeleting(null);setDeleted(true);setRetry(v=>v+1)
 }catch(e){setDeleteError(errorMessage(e))}finally{setSaving(false)}}
 function editAppointment(row:VetAppointment){setFormOpen(true);setEditing(row);setTitle(row.title);setTime(localTime(row.starts_at,zone));setLocation(row.location);setNotes(row.notes);setSaved(false);setSaveError('');document.getElementById('health-appointment-form')?.scrollIntoView({behavior:'smooth'})}
 useEffect(()=>{if(formOpen)document.getElementById('health-appointment-form')?.scrollIntoView({behavior:'smooth'})},[formOpen,editing])
 const events=[...rows.filter(row=>Date.parse(row.starts_at)>=Date.now()).map(row=>({id:'visit-'+row.id,title:row.title,day:localTime(row.starts_at,zone).slice(0,10),time:localTime(row.starts_at,zone).slice(11),kind:'Vet appointment',row,link:''})),...vaccinations.filter(row=>row.next_due_on!>=today).map(row=>({id:'vaccine-'+row.id,title:row.name,day:row.next_due_on!,time:'',kind:'Vaccination due',row:null,link:`/health/vaccinations?record=${encodeURIComponent(row.id)}`}))].sort((a,b)=>(a.day+a.time).localeCompare(b.day+b.time))
 const datePart=(day:string,part:'month'|'day'|'year')=>new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',...(part==='month'?{month:'short' as const}:part==='day'?{day:'2-digit' as const}:{year:'numeric' as const})}).format(new Date(day+'T12:00Z'))
 return <div className="walk-page vet-page"><PageTitle eyebrow="HEALTH" title="Health">Your dog’s care, records and appointments, together in one place.</PageTitle>
 <nav className="health-hub-options" aria-label="Health features">{[
 {path:'vaccinations',title:'Vaccinations',description:'Records and next due dates',icon:Syringe},
 {path:'medications',title:'Medications',description:'Schedules and dose logs',icon:Pill},
 {path:'treatments',title:'Treatments',description:'Past care and treatment notes',icon:Stethoscope},
 {path:'weight',title:'Weight',description:'Measurements and trends',icon:Activity},
 {path:'documents',title:'Documents',description:'Prescriptions and health files',icon:FolderHeart},
 {path:'contacts',title:'Vet contacts',description:'Your veterinary care team',icon:Phone},
 ].map(item=><Link className="health-hub-option" key={item.path} to={`/health/${item.path}`}><item.icon size={26} strokeWidth={1.7} aria-hidden="true"/><div><h2>{item.title}</h2><p>{item.description}</p></div><ArrowUpRight size={18} aria-hidden="true"/></Link>)}</nav>
 <section className="card health-upcoming"><header className="health-upcoming-header"><h2>Upcoming events{!loading&&!error&&!vaccineError&&` (${events.length})`}</h2><Button className="secondary" onClick={()=>{reset();setTime(today+'T09:00');setFormOpen(true);setSaved(false)}}>Add appointment</Button></header>
 {loading?<p role="status">Loading upcoming events…</p>:error?<><Notice error>{error}</Notice><Button onClick={()=>setRetry(v=>v+1)}>Try again</Button></>:<>{vaccineError&&<><Notice error>Vaccination dates could not be loaded: {vaccineError}</Notice><Button className="secondary" onClick={()=>setRetry(v=>v+1)}>Retry vaccination dates</Button></>}{events.length===0?<p>No upcoming events recorded.</p>:<ul className="health-event-list">{events.map(event=><li key={event.id}><div className="health-event-date" aria-hidden="true"><span>{datePart(event.day,'month')}</span><strong>{datePart(event.day,'day')}</strong><span>{datePart(event.day,'year')}</span></div><div className="health-event-copy"><h3>{event.title}</h3><p>{event.kind}</p><time dateTime={event.row?.starts_at||event.day}>{event.time||'Date only'}<span className="sr-only"> · {event.day}</span></time></div>{event.row?<button type="button" className="health-event-open" aria-label={`View appointment ${event.title}`} onClick={()=>editAppointment(event.row!)}>Details →</button>:<Link className="health-event-open" to={event.link}>Details →</Link>}</li>)}</ul>}</>}
 </section>
 {deleted&&<Notice>Appointment deleted.</Notice>}
 {deleting&&<section className="card" aria-label="Confirm appointment deletion"><h2>Delete {deleting.title}?</h2><p>{localTime(deleting.starts_at,zone).replace('T',' · ')}</p><p>This permanently removes the appointment for everyone in your family. This cannot be undone.</p>{deleteError&&<Notice error>{deleteError}</Notice>}<div className="walk-actions"><Button disabled={saving} onClick={()=>void removeAppointment()}>{saving?'Deleting…':'Confirm deletion'}</Button><Button disabled={saving} className="secondary" onClick={()=>{setDeleting(null);setDeleteError('')}}>Keep appointment</Button></div></section>}
 {saved&&<Notice>Appointment saved.</Notice>}
 {formOpen&&<section className="card" id="health-appointment-form"><h2>{editing?'Edit veterinary appointment':'New veterinary appointment'}</h2><form onSubmit={save}><fieldset disabled={saving} className="vet-fields"><Field label="Title" required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/><Field label="Date and time" type="datetime-local" required value={time} onChange={e=>setTime(e.target.value)}/><Field label="Vet / location" maxLength={200} value={location} onChange={e=>setLocation(e.target.value)}/><Field label="Notes" maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)}/>{saveError&&<Notice error>{saveError} Please check your access and try saving again.</Notice>}<div className="walk-actions"><Button type="submit">{saving?'Saving…':'Save appointment'}</Button><Button type="button" className="secondary" onClick={()=>{reset();setFormOpen(false)}}>Cancel</Button>{editing&&<Button type="button" className="secondary" onClick={()=>{setDeleting(editing);setDeleteError('')}}>Delete appointment</Button>}</div></fieldset></form>{saved&&<Notice>Appointment saved.</Notice>}</section>}
 <details className="card health-appointment-history"><summary>All appointments ({rows.length})</summary>{loading?<p role="status">Loading appointments…</p>:error?<Notice error>{error}</Notice>:rows.length===0?<p>No appointments recorded.</p>:<ul className="walk-history health-record-list">{rows.map(row=><li key={row.id}><h3>{row.title}</h3><p><time dateTime={row.starts_at}>{localTime(row.starts_at,zone).replace('T',' · ')}</time></p>{row.location&&<p>{row.location}</p>}{row.notes&&<p className="walk-notes">{row.notes}</p>}<Button className="secondary" onClick={()=>editAppointment(row)}>Edit record</Button><Button className="secondary" disabled={saving} onClick={()=>{setDeleting(row);setDeleteError('');setDeleted(false);window.scrollTo({top:0})}}>Delete</Button></li>)}</ul>}</details></div>
}

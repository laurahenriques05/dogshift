import { VisitDocuments } from './VisitDocuments'
import { useEffect, useRef, useState } from 'react'
import { Button, Field, Notice, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
import type { VetAppointment } from '../../lib/supabase/database.types'
import { localTime, toInstant } from './time'

export function AppointmentSummary({ appointment, zone, onClose, onSaved }: { appointment: VetAppointment; zone: string; onClose: () => void; onSaved: () => void }) {
 const dialog = useRef<HTMLDialogElement>(null)
 const [reason, setReason] = useState(''), [observations, setObservations] = useState(''), [treatment, setTreatment] = useState(''), [nextVisit, setNextVisit] = useState('')
 const [medicationIds, setMedicationIds] = useState<string[]>([]), [paths, setPaths] = useState<string[]>([])
 const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0), [loadFailed, setLoadFailed] = useState(false)
 useEffect(() => { dialog.current?.showModal() }, [])
 useEffect(() => {
  let active = true
  setLoading(true); setLoadFailed(false); setError('');
  void (async () => {
   try {
    const result = await db().from('appointment_summaries').select('*').eq('appointment_id', appointment.id).maybeSingle()
    if (result.error) throw result.error
    if (!active) return
    const row = result.data
    setReason(row?.reason || ''); setObservations(row?.observations || ''); setTreatment(row?.treatment || ''); setNextVisit(row?.next_visit_at ? localTime(row.next_visit_at, zone) : '')
    setMedicationIds(row?.medication_ids || []); setPaths(row?.document_paths || [])
   } catch (e) { if (active) { setError(errorMessage(e)); setLoadFailed(true) } }
   finally { if (active) setLoading(false) }
  })()
  return () => { active = false }
 }, [appointment.id, appointment.household_id, zone, retry])
 async function save(event: React.FormEvent) {
  event.preventDefault(); setBusy(true); setError('')
  try {
   const values = { appointment_id: appointment.id, reason: reason.trim(), observations: observations.trim(), treatment: treatment.trim(), next_visit_at: nextVisit ? toInstant(nextVisit, zone) : null, medication_ids: medicationIds, document_paths: paths }
   const result = await db().from('appointment_summaries').upsert(values, { onConflict: 'appointment_id' }).select().single()
   if (result.error) throw result.error
   onSaved()
  } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
 }
 return <dialog ref={dialog} className="health-folder-dialog" aria-labelledby="visit-summary-title" onCancel={event => { if (busy) event.preventDefault(); else onClose() }}>
  <section><h2 id="visit-summary-title">Visit summary</h2><p>{appointment.title} · {localTime(appointment.starts_at, zone).replace('T', ' · ')}</p>
   {loading ? <p role="status">Loading visit summary…</p> : loadFailed ? <><Notice error>{error}</Notice><Button onClick={() => setRetry(value => value + 1)}>Try again</Button><Button className="secondary" onClick={onClose}>Close</Button></> : <form onSubmit={save}><fieldset disabled={busy} className="vet-fields">
    <Field label="Reason for visit" maxLength={2000} value={reason} onChange={e => setReason(e.target.value)}/>
    <label className="field">Veterinarian’s observations<textarea rows={4} maxLength={4000} value={observations} onChange={e => setObservations(e.target.value)}/></label>
    <label className="field">Prescribed treatment / medication<textarea rows={4} maxLength={4000} value={treatment} onChange={e => setTreatment(e.target.value)}/></label>
    <Field label="Next visit (optional)" type="datetime-local" value={nextVisit} onChange={e => setNextVisit(e.target.value)} hint="Record the date supplied by your veterinarian. To schedule it and receive reminders, also add an appointment in Health."/>
    <VisitDocuments home={appointment.household_id} paths={paths} onChange={setPaths} busy={busy} onBusy={setBusy}/>
    {error && <Notice error>{error}</Notice>}
    <div className="walk-actions visit-summary-actions"><Button type="submit" >{busy ? 'Saving…' : 'Save summary'}</Button><Button type="button" className="secondary" onClick={onClose}>Close</Button><Button type="button" className="secondary" onClick={() => setRetry(value => value + 1)}>Reload saved summary</Button></div>
   </fieldset></form>}
   {loading && <Button className="secondary" onClick={onClose}>Close</Button>}
  </section>
 </dialog>
}

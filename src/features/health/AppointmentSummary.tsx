import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Field, Notice, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
import type { MedicationSchedule, VetAppointment } from '../../lib/supabase/database.types'
import { documentLabel } from './documentFolders'
import { localTime, toInstant } from './time'

type DocumentOption = { path: string; name: string }
export function AppointmentSummary({ appointment, zone, onClose, onSaved }: { appointment: VetAppointment; zone: string; onClose: () => void; onSaved: () => void }) {
 const dialog = useRef<HTMLDialogElement>(null)
 const [reason, setReason] = useState(''), [observations, setObservations] = useState(''), [treatment, setTreatment] = useState(''), [nextVisit, setNextVisit] = useState('')
 const [medicationIds, setMedicationIds] = useState<string[]>([]), [paths, setPaths] = useState<string[]>([])
 const [medications, setMedications] = useState<MedicationSchedule[]>([]), [documents, setDocuments] = useState<DocumentOption[]>([])
 const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [optionError, setOptionError] = useState(''), [retry, setRetry] = useState(0), [loadFailed, setLoadFailed] = useState(false)
 useEffect(() => { dialog.current?.showModal() }, [])
 useEffect(() => {
  let active = true
  setLoading(true); setLoadFailed(false); setError(''); setOptionError(''); setMedications([]); setDocuments([])
  void (async () => {
   try {
    const result = await db().from('appointment_summaries').select('*').eq('appointment_id', appointment.id).maybeSingle()
    if (result.error) throw result.error
    if (!active) return
    const row = result.data
    setReason(row?.reason || ''); setObservations(row?.observations || ''); setTreatment(row?.treatment || ''); setNextVisit(row?.next_visit_at ? localTime(row.next_visit_at, zone) : '')
    setMedicationIds(row?.medication_ids || []); setPaths(row?.document_paths || [])
    try {
     const meds = await db().from('medication_schedules').select('*').eq('household_id', appointment.household_id).order('name')
     if (meds.error) throw meds.error
     const list = async (prefix: string) => {
      const items = []
      for (let offset = 0; ; offset += 100) {
       const page = await db().storage.from('health-documents').list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } })
       if (page.error) throw page.error
       items.push(...page.data)
       if (page.data.length < 100) break
      }
      return items
     }
     const files: DocumentOption[] = []
     for (const uploader of await list(appointment.household_id)) {
      if (uploader.id) continue
      for (const file of await list(`${appointment.household_id}/${uploader.name}`)) if (file.id) files.push({ path: `${appointment.household_id}/${uploader.name}/${file.name}`, name: documentLabel(file.name).name })
     }
     if (active) { setMedications(meds.data); setDocuments(files) }
    } catch (e) { if (active) setOptionError(errorMessage(e)) }
   } catch (e) { if (active) { setError(errorMessage(e)); setLoadFailed(true) } }
   finally { if (active) setLoading(false) }
  })()
  return () => { active = false }
 }, [appointment.id, appointment.household_id, zone, retry])
 const toggle = (items: string[], value: string) => items.includes(value) ? items.filter(item => item !== value) : [...items, value]
 async function save(event: React.FormEvent) {
  event.preventDefault(); setBusy(true); setError('')
  try {
   const values = { appointment_id: appointment.id, reason: reason.trim(), observations: observations.trim(), treatment: treatment.trim(), next_visit_at: nextVisit ? toInstant(nextVisit, zone) : null, medication_ids: medicationIds, document_paths: paths }
   const result = await db().from('appointment_summaries').upsert(values, { onConflict: 'appointment_id' }).select().single()
   if (result.error) throw result.error
   onSaved()
  } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
 }
 async function download(file: DocumentOption) {
  setBusy(true); setError('')
  try {
   const result = await db().storage.from('health-documents').download(file.path)
   if (result.error) throw result.error
   const url = URL.createObjectURL(result.data), anchor = document.createElement('a')
   anchor.href = url; anchor.download = file.name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
 }
 return <dialog ref={dialog} className="health-folder-dialog" aria-labelledby="visit-summary-title" onCancel={event => { if (busy) event.preventDefault(); else onClose() }}>
  <section><h2 id="visit-summary-title">Visit summary</h2><p>{appointment.title} · {localTime(appointment.starts_at, zone).replace('T', ' · ')}</p>
   {loading ? <p role="status">Loading visit summary…</p> : loadFailed ? <><Notice error>{error}</Notice><Button onClick={() => setRetry(value => value + 1)}>Try again</Button><Button className="secondary" onClick={onClose}>Close</Button></> : <form onSubmit={save}><fieldset disabled={busy} className="vet-fields">
    <Field label="Reason for visit" maxLength={2000} value={reason} onChange={e => setReason(e.target.value)}/>
    <label className="field">Veterinarian’s observations<textarea rows={4} maxLength={4000} value={observations} onChange={e => setObservations(e.target.value)}/></label>
    <label className="field">Prescribed treatment / medication<textarea rows={4} maxLength={4000} value={treatment} onChange={e => setTreatment(e.target.value)}/></label>
    <Field label="Next visit (optional)" type="datetime-local" value={nextVisit} onChange={e => setNextVisit(e.target.value)} hint="Record the date supplied by your veterinarian. To schedule it and receive reminders, also add an appointment in Health."/>
    <h3>Related medication</h3><Link to="/health/medications">Manage medication →</Link>
    {medications.length ? medications.map(med => <label key={med.id}><input type="checkbox" checked={medicationIds.includes(med.id)} onChange={() => setMedicationIds(toggle(medicationIds, med.id))}/> {med.name}</label>) : <p>No medication schedules available.</p>}
    {medicationIds.filter(id => !medications.some(med => med.id === id)).map(id => <label key={id}><input type="checkbox" checked onChange={() => setMedicationIds(toggle(medicationIds, id))}/> Unavailable medication — uncheck to remove link</label>)}
    <h3>Related documents</h3><Link to="/health/documents">Manage documents →</Link>
    {documents.length ? documents.map(file => <div key={file.path}><label><input type="checkbox" checked={paths.includes(file.path)} onChange={() => setPaths(toggle(paths, file.path))}/> {file.name}</label>{paths.includes(file.path) && <Button type="button" className="secondary" onClick={() => void download(file)}>Download</Button>}</div>) : <p>No documents available. Upload files in Documents first.</p>}
    {paths.filter(path => !documents.some(file => file.path === path)).map(path => <label key={path}><input type="checkbox" checked onChange={() => setPaths(toggle(paths, path))}/> Unavailable document — uncheck to remove link</label>)}
    {optionError && <Notice error>Related records could not be loaded: {optionError} Close and reopen to try again.</Notice>}
    {error && <Notice error>{error}</Notice>}
    <div className="walk-actions"><Button type="submit" disabled={!!optionError}>{busy ? 'Saving…' : 'Save summary'}</Button><Button type="button" className="secondary" onClick={onClose}>Close</Button><Button type="button" className="secondary" onClick={() => setRetry(value => value + 1)}>Reload saved summary</Button></div>
   </fieldset></form>}
   {loading && <Button className="secondary" onClick={onClose}>Close</Button>}
  </section>
 </dialog>
}

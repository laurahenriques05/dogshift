import { useState } from 'react'
import { Button, Notice, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
import { useHousehold } from '../household/HouseholdProvider'
import { useAuth } from './AuthProvider'

export function DeletionControls() {
 const { household, membership } = useHousehold()
 const { session } = useAuth()
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 const [message, setMessage] = useState('')
 const pending = Boolean((household as (typeof household & { deletion_requested_by?: string | null }) | null)?.deletion_requested_by)

 async function invoke(name: 'delete-household' | 'delete-account', body: Record<string, string>) {
  setBusy(true); setError(''); setMessage('')
  try {
   const result = await db().functions.invoke(name, { body })
   if (result.error) throw result.error
   setMessage(name === 'delete-account' ? 'Account deletion completed.' : 'Family deletion completed.')
   if (name === 'delete-account') await db().auth.signOut()
  } catch (cause) { setError(errorMessage(cause)) } finally { setBusy(false) }
 }

 function deleteFamily() {
  if (!household) return
  const confirmation = window.prompt(`To permanently ${pending ? 'finish deleting' : 'delete'} “${household.name}”, type the family name exactly:`)
  if (confirmation === null) return
  if (confirmation !== household.name) { setError('The family name did not match. Nothing was deleted.'); return }
  void invoke('delete-household', { household: household.id, confirmation })
 }

 function deleteAccount() {
  const confirmation = window.prompt('This permanently deletes your account. Type DELETE MY ACCOUNT to continue:')
  if (confirmation === null) return
  if (confirmation !== 'DELETE MY ACCOUNT') { setError('Type DELETE MY ACCOUNT exactly. Nothing was deleted.'); return }
  void invoke('delete-account', { confirmation })
 }

 return (
  <section className="card" aria-labelledby="permanent-deletion-title">
   <h2 id="permanent-deletion-title">Permanent deletion</h2>
   <p>These actions cannot be undone. Family deletion is available only to the sole current owner.</p>
   {pending && <Notice>Family deletion is in progress. Retry to finish it after an interrupted cleanup.</Notice>}
   {error && <Notice error>{error}</Notice>}
   {message && <Notice>{message}</Notice>}
   <div className="walk-actions">
    <Button type="button" disabled={busy || !household || membership?.role !== 'owner'} onClick={deleteFamily}>
     {busy ? 'Deleting…' : pending ? 'Retry family deletion' : 'Permanently delete family'}
    </Button>
    <Button type="button" className="secondary" disabled={busy || !session} onClick={deleteAccount}>
     {busy ? 'Deleting…' : 'Permanently delete my account'}
    </Button>
   </div>
   {!household && <p role="status">Join or create a family before deleting one.</p>}
   {household && membership?.role !== 'owner' && <p>Only the family owner can request family deletion.</p>}
  </section>
 )
}

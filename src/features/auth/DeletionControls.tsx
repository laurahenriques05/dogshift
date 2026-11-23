import { useEffect, useState } from 'react'
import { Button, Notice, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
import { useHousehold } from '../household/HouseholdProvider'
import { useAuth } from './AuthProvider'

type PendingDeletion = { id: string; name: string }

export function DeletionControls() {
 const { household, membership } = useHousehold()
 const { session } = useAuth()
 const storageKey = session ? `dogshift.pending-household-deletion.${session.user.id}` : ''
 const [pendingRequest, setPendingRequest] = useState<PendingDeletion | null>(() => {
  try { const value = storageKey ? JSON.parse(localStorage.getItem(storageKey) || 'null') : null; return value?.id && value?.name ? value : null } catch { return null }
 })
 const [busy, setBusy] = useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 useEffect(()=>{try{const value=storageKey?JSON.parse(localStorage.getItem(storageKey)||'null'):null;setPendingRequest(value?.id&&value?.name?value:null)}catch{setPendingRequest(null)}},[storageKey])
 const serverPending = Boolean((household as (typeof household & { deletion_requested_by?: string | null }) | null)?.deletion_requested_by)
 const pending = serverPending || Boolean(pendingRequest)
 const familyId = pendingRequest?.id || household?.id
 const familyName = pendingRequest?.name || household?.name
 const canDeleteActive = Boolean(household && membership?.role === 'owner')

 async function invoke(name: 'delete-household' | 'delete-account', body: Record<string, string>) {
  setBusy(true);setError('');setMessage('')
  try { const result=await db().functions.invoke(name,{body});if(result.error)throw result.error;setMessage(name==='delete-account'?'Account deletion completed.':'Family deletion completed.');if(name==='delete-household'&&storageKey){localStorage.removeItem(storageKey);setPendingRequest(null)}if(name==='delete-account')await db().auth.signOut()} catch(cause){setError(errorMessage(cause))}finally{setBusy(false)}
 }
 function deleteFamily() {
  if(!familyId||!familyName||(!canDeleteActive&&!pendingRequest))return
  const confirmation=window.prompt(`To permanently ${pending?'finish deleting':'delete'} “${familyName}”, type the family name exactly:`)
  if(confirmation===null)return
  if(confirmation!==familyName){setError('The family name did not match. Nothing was deleted.');return}
  if(storageKey){localStorage.setItem(storageKey,JSON.stringify({id:familyId,name:familyName}));setPendingRequest({id:familyId,name:familyName})}
  void invoke('delete-household',{household:familyId,confirmation})
 }
 function deleteAccount(){const confirmation=window.prompt('This permanently deletes your account. Type DELETE MY ACCOUNT to continue:');if(confirmation===null)return;if(confirmation!=='DELETE MY ACCOUNT'){setError('Type DELETE MY ACCOUNT exactly. Nothing was deleted.');return}void invoke('delete-account',{confirmation})}
 return <section className="card" aria-labelledby="permanent-deletion-title"><h2 id="permanent-deletion-title">Permanent deletion</h2><p>These actions cannot be undone. Family deletion is available only to the sole current owner.</p>{pending&&<Notice>Family deletion is in progress. Retry to finish it after an interrupted cleanup.</Notice>}{error&&<Notice error>{error}</Notice>}{message&&<Notice>{message}</Notice>}<div className="walk-actions"><Button type="button" disabled={busy||(!canDeleteActive&&!pendingRequest)} onClick={deleteFamily}>{busy?'Deleting…':pending?'Retry family deletion':'Permanently delete family'}</Button><Button type="button" className="secondary" disabled={busy||!session} onClick={deleteAccount}>{busy?'Deleting…':'Permanently delete my account'}</Button></div>{!household&&!pendingRequest&&<p role="status">Join or create a family before deleting one.</p>}{household&&membership?.role!=='owner'&&!pendingRequest&&<p>Only the family owner can request family deletion.</p>}</section>
}

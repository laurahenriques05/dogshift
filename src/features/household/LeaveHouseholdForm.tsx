import { Select } from '../../components/ui/Select'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Notice, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
import type { FamilyMember } from '../../lib/supabase/database.types'
import { useAuth } from '../auth/AuthProvider'
import { forgetInvitation } from './invitations'
import { useHousehold } from './HouseholdProvider'

export function LeaveHouseholdForm({ members, ready = true }: { members: FamilyMember[]; ready?: boolean }) {
 const { household, membership, reload } = useHousehold()
 const { session } = useAuth()
 const navigate = useNavigate()
 const [open, setOpen] = useState(false)
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 const owner = membership?.role === 'owner'
 const others = members.filter(member => member.user_id !== session?.user.id)
 const verifiedMembers=ready&&members.some(member=>member.user_id===session?.user.id)
 const soleMember=verifiedMembers&&owner&&members.length===1
 async function leave(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  setBusy(true); setError('')
  try {
   if(!verifiedMembers)throw new Error('Wait for the family member list to load, then try again.')
   const result=soleMember
    ? await db().rpc('leave_sole_household',{p_household:household!.id})
    : await db().rpc('leave_household',{p_household:household!.id,p_new_owner:owner?String(form.get('new_owner')||''):null})
   const {error}=result
   if (error) throw error
   forgetInvitation()
   await reload()
   navigate('/', { replace: true })
  } catch (error) { setError(errorMessage(error)) }
  finally { setBusy(false) }
 }
 return <section className="card household-leave"><h2>Your household membership</h2>
  <p className="muted">You can leave this family and join another using an invitation code. Your DogShift account stays active.</p>
  {!open ? <Button className="secondary" disabled={!verifiedMembers} onClick={() => setOpen(true)}>Leave household</Button> : <form className="form-stack" onSubmit={leave}>
   {soleMember?<Notice>You are the only member of {household?.name}. Leaving makes this family inactive. Its dog profile, records, photos and documents are kept. Your account stays active, and you can create or join another family. You can restore this family later from Account settings. Existing invitation codes will be revoked.</Notice>:<p className="muted">Leave {household?.name}? You’ll lose access to this family’s dog and shared information. The family and dog stay available to the remaining members.</p>}
   {owner && !soleMember && (others.length ? <label className="field">Choose the next owner<Select name="new_owner" required defaultValue=""><option value="" disabled>Select a family member</option>{others.map(member => <option key={member.user_id} value={member.user_id}>{member.display_name}</option>)}</Select><small>Ownership transfers when you confirm leaving.</small></label> : <Notice>Reload the family member list before leaving.</Notice>)}
   {error && <Notice error>{error}</Notice>}
   <div className="family-name-actions"><Button disabled={busy || !verifiedMembers || (owner && !soleMember && !others.length)}>{busy ? 'Leaving…' : 'Confirm and leave'}</Button><Button type="button" className="secondary" disabled={busy} onClick={() => { setOpen(false); setError('') }}>Cancel</Button></div>
  </form>}
 </section>
}

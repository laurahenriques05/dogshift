import { useEffect, useRef, useState } from 'react'
import { Button, Notice, errorMessage, isSchemaUnavailable } from '../../components/ui'
import { permanentlyDeleteWalk, setWalkDeletion } from './api'

export function RestoreWalkDialog({ walkId, onCancel, onRestored, action = 'restore' }: { walkId: string; action?: 'restore' | 'delete' | 'permanent'; onCancel: () => void; onRestored: (action:'restore'|'delete'|'permanent') => Promise<void> }) {
 const [choice,setChoice]=useState(action)
 const dialog = useRef<HTMLDialogElement>(null), pending = useRef(false)
 const [busy, setBusy] = useState(false), [error, setError] = useState('')
 useEffect(() => {
  const previous = document.activeElement as HTMLElement | null
  const element = dialog.current!
  element.showModal()
  element.focus({ preventScroll: true })
  return () => { element.close(); previous?.focus() }
 }, [])
 useEffect(()=>{dialog.current?.querySelector<HTMLButtonElement>('button')?.focus()},[choice])
 async function confirm() {
  if (pending.current) return
  pending.current = true; setBusy(true); setError('')
  try { if(choice==='permanent')await permanentlyDeleteWalk(walkId);else await setWalkDeletion(walkId, choice === 'delete'); await onRestored(choice) }
  catch (e) { setError(isSchemaUnavailable(e)?'Walk removal is not available yet. Please try again later.':`Could not ${choice==='permanent'?'permanently delete':choice} this walk. ${errorMessage(e)}`) }
  finally { pending.current = false; setBusy(false) }
 }
 return <dialog ref={dialog} tabIndex={-1} className="walk-restore-dialog" aria-labelledby="walk-restore-message" onCancel={event => { event.preventDefault(); if (!pending.current) onCancel() }}>
  <p id="walk-restore-message">{choice === 'permanent' ? 'Permanently remove this walk from the family history? It cannot be restored.' : choice === 'delete' ? "This walk will be removed from the family history. Its author can restore it." : 'This walk was deleted from family history.'}</p>
  {error && <Notice error>{error}</Notice>}
  <div className="walk-restore-actions"><Button disabled={busy} onClick={() => void confirm()}>{busy ? (choice !== 'restore' ? 'Deleting walk…' : 'Restoring walk…') : choice === 'permanent' ? 'Delete permanently' : choice === 'delete' ? 'Confirm delete' : 'Confirm walk restoration'}</Button>{choice==='delete'&&<Button className="secondary" disabled={busy} onClick={()=>{setError('');setChoice('permanent')}}>Delete permanently instead</Button>}<Button className="secondary" disabled={busy} onClick={onCancel}>Cancel</Button></div>
 </dialog>
}

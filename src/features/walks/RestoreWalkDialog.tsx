import { useEffect, useRef, useState } from 'react'
import { Button, Notice, errorMessage } from '../../components/ui'
import { setWalkDeletion } from './api'

export function RestoreWalkDialog({ walkId, onCancel, onRestored, action = 'restore' }: { walkId: string; action?: 'restore' | 'delete'; onCancel: () => void; onRestored: () => Promise<void> }) {
 const dialog = useRef<HTMLDialogElement>(null), pending = useRef(false)
 const [busy, setBusy] = useState(false), [error, setError] = useState('')
 useEffect(() => {
  const previous = document.activeElement as HTMLElement | null
  const element = dialog.current!
  element.showModal()
  element.focus({ preventScroll: true })
  return () => { element.close(); previous?.focus() }
 }, [])
 async function confirm() {
  if (pending.current) return
  pending.current = true; setBusy(true); setError('')
  try { await setWalkDeletion(walkId, action === 'delete'); await onRestored() }
  catch (e) { setError(`Could not ${action} this walk. ${errorMessage(e)}`) }
  finally { pending.current = false; setBusy(false) }
 }
 return <dialog ref={dialog} tabIndex={-1} className="walk-restore-dialog" aria-labelledby="walk-restore-message" onCancel={event => { event.preventDefault(); if (!pending.current) onCancel() }}>
  <p id="walk-restore-message">{action === 'delete' ? "This walk will be deleted from family walks' history." : 'This walk was deleted from family history.'}</p>
  {error && <Notice error>{error}</Notice>}
  <div className="walk-restore-actions"><Button disabled={busy} onClick={() => void confirm()}>{busy ? (action === 'delete' ? 'Deleting walk…' : 'Restoring walk…') : action === 'delete' ? 'Confirm delete' : 'Confirm walk restoration'}</Button><Button className="secondary" disabled={busy} onClick={onCancel}>Cancel</Button></div>
 </dialog>
}

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '../../components/ui'
import type { DailySlot } from './dailyWalks'
import type { DailyWalkRoutine } from './useDailyWalkRoutine'
import { WalkWastePanel } from './WalkWastePanel'
import { WalkNoteHistory } from './WalkNoteHistory'
export function WalkRoutineSummary({slot,user,zone,routine,onClose}:{slot:DailySlot;user:string;zone:string;routine:DailyWalkRoutine;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),id=useId()
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const element=dialog.current!;element.showModal();element.focus();return()=>{element.close();previous?.focus()}},[])
 return <dialog ref={dialog} tabIndex={-1} className="walk-routine-summary" aria-labelledby={id} onCancel={event=>{event.preventDefault();onClose()}}><button type="button" className="walk-location-close" aria-label="Close walk summary" onClick={onClose}><X size={18} aria-hidden="true"/></button><h3 id={id} className="walk-routine-summary-title">Walk Summary</h3>{slot.walk?<><WalkWastePanel walkId={slot.walk.id} own={slot.walk.walker_id===user} finished readOnly iconCounts/><h4>Notes</h4><WalkNoteHistory walkId={slot.walk.id} user={user} legacy={slot.walk.notes} timezone={zone} showEmpty/></>:<p className="walk-routine-manual-message">This outing was marked as done without a recorded walk. No dog waste or notes were recorded for it.</p>}{routine.error&&<p role="alert">{routine.error}</p>}<div className="walk-routine-summary-actions">{slot.manual?.member_id===user&&<Button className="secondary" disabled={routine.busy} onClick={async()=>{if(await routine.undo(slot.manual!.id))onClose()}}>Undo recorded outing</Button>}<Button className="secondary walk-routine-summary-close" onClick={onClose}>Close summary</Button></div></dialog>
}

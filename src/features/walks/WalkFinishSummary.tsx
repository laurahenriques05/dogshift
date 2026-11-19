import { WalkNoteHistory } from './WalkNoteHistory'
import type { Walk } from '../../lib/supabase/database.types'
import { noteDraftKey, parseNoteDraft, type NoteDraft } from './noteDraft'
import { WalkWastePanel } from './WalkWastePanel'
export function WalkFinishSummary({walk,user,draft,timezone}:{walk:Walk;user:string;draft?:NoteDraft;timezone?:string}){
 let local=draft
 if(!local)try{local=parseNoteDraft(localStorage.getItem(noteDraftKey(user,walk.id)))??undefined}catch{/* Saved note remains available. */}
 const note=local?.text&&local.text!==local.expected?local.text:''
 return <div className="walk-finish-summary"><WalkNoteHistory walkId={walk.id} user={user} legacy={walk.notes} timezone={timezone}/>{note.trim()&&<section><h3>Notes</h3><p className="walk-notes">{note}</p></section>}<WalkWastePanel walkId={walk.id} own finished={false} ending/></div>
}

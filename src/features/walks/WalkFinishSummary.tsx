import type { Walk } from '../../lib/supabase/database.types'
import { noteDraftKey, parseNoteDraft, type NoteDraft } from './noteDraft'
import { WalkWastePanel } from './WalkWastePanel'
export function WalkFinishSummary({walk,user,draft}:{walk:Walk;user:string;draft?:NoteDraft}){
 let local=draft
 if(!local)try{local=parseNoteDraft(localStorage.getItem(noteDraftKey(user,walk.id)))??undefined}catch{/* Saved note remains available. */}
 const note=local?.text??walk.notes
 return <div className="walk-finish-summary">{note.trim()&&<section><h3>Notes</h3><p className="walk-notes">{note}</p></section>}<WalkWastePanel walkId={walk.id} own finished={false} ending/></div>
}

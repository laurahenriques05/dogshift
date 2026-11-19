import { useWalkJournal } from './useWalkJournal'
export function WalkNoteHistory({walkId,user,legacy='',timezone}:{walkId:string;user:string;legacy?:string;timezone?:string}){
 const {notes,unavailable}=useWalkJournal(walkId,user)
 if(!notes.length&&!legacy&&!unavailable)return null
 return <div className="walk-note-history" aria-label="Walk notes history">{legacy&&<article><p className="walk-notes">{legacy}</p></article>}{notes.map(note=><article key={note.id}><header><time dateTime={note.recorded_at}>{new Date(note.recorded_at).toLocaleString(undefined,{timeZone:timezone,dateStyle:'short',timeStyle:'short'})}</time>{note.pending&&<span>Pending sync</span>}</header><p className="walk-notes">{note.text}</p></article>)}{unavailable&&!notes.length&&!legacy&&<p className="walk-note-status">Notes unavailable. Retry when connected.</p>}</div>
}

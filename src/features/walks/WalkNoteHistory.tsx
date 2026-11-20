import { useWalkJournal } from './useWalkJournal'
export function WalkNoteHistory({walkId,user,legacy='',timezone,showEmpty=false}:{walkId:string;user:string;legacy?:string;timezone?:string;showEmpty?:boolean}){
 const {notes,unavailable,loading}=useWalkJournal(walkId,user)
 if(!notes.length&&!legacy&&!unavailable)return showEmpty?(loading?<p role="status">Loading notes…</p>:<p>No notes recorded for this walk.</p>):null
 return <div className="walk-note-history" aria-label="Walk notes history">{legacy&&<article><p className="walk-notes">{legacy}</p></article>}{notes.map(note=><article key={note.id}><header><time dateTime={note.recorded_at}>{new Date(note.recorded_at).toLocaleString(undefined,{timeZone:timezone,dateStyle:'short',timeStyle:'short'})}</time>{note.pending&&<span>Pending sync</span>}</header><p className="walk-notes">{note.text}</p></article>)}{unavailable&&!notes.length&&!legacy&&<p className="walk-note-status">Notes unavailable. Retry when connected.</p>}</div>
}

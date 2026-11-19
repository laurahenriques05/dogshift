import { useEffect, useState } from 'react'
import { loadJournal, mergeJournal, pendingNotes, type JournalNote } from './noteJournal'
export function useWalkJournal(walk:string,user:string){
 const [notes,setNotes]=useState<JournalNote[]>([]),[revision,setRevision]=useState(0),[unavailable,setUnavailable]=useState(false),[loading,setLoading]=useState(true)
 useEffect(()=>{const refresh=()=>setRevision(value=>value+1);window.addEventListener('pawshare:walk-notes',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('pawshare:walk-notes',refresh);window.removeEventListener('storage',refresh)}},[])
 useEffect(()=>{let alive=true;setLoading(true);let pending:JournalNote[]=[];try{pending=pendingNotes(user,walk)}catch{/* The editor reports unavailable device storage. */}setNotes(previous=>mergeJournal(previous.filter(note=>!note.pending),pending));void loadJournal(walk).then(saved=>{if(alive){setNotes(mergeJournal(saved,pending));setUnavailable(false)}}).catch(()=>{if(alive)setUnavailable(true)}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[walk,user,revision])
 return {notes,unavailable,loading,refresh:()=>setRevision(value=>value+1)}
}

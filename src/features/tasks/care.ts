import { useCallback,useEffect,useState } from 'react'
import { db } from '../../lib/supabase/client'
import { errorMessage,isSchemaUnavailable } from '../../components/ui'
import type { TaskOccurrence } from '../../lib/supabase/database.types'
export function careHref(row:Pick<TaskOccurrence,'id'|'care_kind'|'completed_at'>){
 if(row.completed_at)return `/tasks?occurrence=${encodeURIComponent(row.id)}`
 return row.care_kind==='feeding'?`/feed?task=${encodeURIComponent(row.id)}`:row.care_kind==='walk'?`/walks?action=start&task=${encodeURIComponent(row.id)}`:`/tasks?occurrence=${encodeURIComponent(row.id)}`
}
export function careError(error:unknown){return `${isSchemaUnavailable(error)?'Care tasks need the database update before they can be saved.':errorMessage(error)} The task stays pending. Reconnect and reload Tasks before trying again; check Feeding or Walks if you already saved.`}
export function useCareTask(id:string|null,home:string,kind:'feeding'|'walk'){
 const key=`${home}:${kind}:${id||''}`, [loadedFor,setLoadedFor]=useState('')
 const [row,setRow]=useState<TaskOccurrence|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(!!id),[revision,setRevision]=useState(0)
 const reload=useCallback(()=>setRevision(n=>n+1),[])
 useEffect(()=>{let live=true;setLoadedFor(key);setRow(null);setError('');setLoading(!!id);if(!id)return
  void (async()=>{try{const result=await db().from('task_occurrences').select('*').eq('id',id).eq('household_id',home).maybeSingle();if(result.error)throw result.error;if(!result.data||result.data.care_kind!==kind)throw new Error('This care task is unavailable in this family.');if(live)setRow(result.data)}catch(e){if(live)setError(careError(e))}finally{if(live)setLoading(false)}})()
  return()=>{live=false}
 },[id,home,kind,key,revision])
 return loadedFor===key?{row,error,loading,reload}:{row:null,error:'',loading:!!id,reload}
}

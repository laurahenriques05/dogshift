import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Notice, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
import { useHousehold } from './HouseholdProvider'

type InactiveFamily={id:string;name:string;left_at:string}
export function InactiveHouseholds(){
 const {reload,select}=useHousehold(),navigate=useNavigate()
 const [families,setFamilies]=useState<InactiveFamily[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{let active=true;setLoading(true);setError('');void(async()=>{try{
  const result=await db().rpc('get_inactive_households',{});if(result.error)throw result.error
  if(active)setFamilies(result.data||[])
 }catch(e){if(active)setError(errorMessage(e))}finally{if(active)setLoading(false)}})();return()=>{active=false}},[retry])
 async function restore(id:string){setBusy(true);setError('');try{
  const result=await db().rpc('restore_inactive_household',{p_household:id});if(result.error)throw result.error
  setFamilies(current=>current.filter(family=>family.id!==id));select(id);await reload();navigate('/',{replace:true})
 }catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 return <section className="card"><h2>Inactive families</h2><p>Families you left as their last member keep their records and files. Restore one to return as its owner.</p>{loading?<p role="status">Loading inactive families…</p>:error?<><Notice error>{error}</Notice><Button type="button" className="secondary" disabled={busy} onClick={()=>setRetry(value=>value+1)}>Try again</Button></>:families.length?<ul className="invitation-list">{families.map(family=><li key={family.id}><strong>{family.name}</strong><Button type="button" className="secondary" disabled={busy} onClick={()=>void restore(family.id)}>{busy?'Restoring…':'Restore family'}</Button></li>)}</ul>:<p>No inactive families.</p>}</section>
}

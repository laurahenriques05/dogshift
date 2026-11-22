import { useEffect, useState } from 'react'
import { db } from '../../lib/supabase/client'
export function useWalkMembers(household: string) {
 const [members,setMembers] = useState<{household:string;names:Map<string,string>} | null>(null)
 useEffect(()=>{
  let live=true
  void (async()=>{try {
   const {data,error}=await db().rpc('get_household_members',{p_household:household})
   if(live)setMembers({household,names:new Map(!error?(data||[]).map(member=>[member.user_id,member.display_name]):[])})
  } catch {if(live)setMembers({household,names:new Map()})}})()
  return()=>{live=false}
 },[household])
 return members?.household===household?members.names:new Map<string,string>()
}

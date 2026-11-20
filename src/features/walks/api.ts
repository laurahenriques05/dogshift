import { db } from '../../lib/supabase/client'
import type { WalkPoint } from '../../lib/supabase/database.types'
export async function getPoints(id:string) {
 const points:WalkPoint[]=[]
 for(let offset=0;;offset+=1000) {
  const result=await db().from('walk_points').select('*').eq('walk_id',id).order('seq').range(offset,offset+999)
  if(result.error) throw result.error
  points.push(...result.data)
  if(result.data.length<1000) return points
 }
}
export async function getWalks(household:string) {
 const walks=[]
 for(let offset=0;;offset+=1000) {
  const result=await db().from('walks').select('*').eq('household_id',household).order('started_at',{ascending:false}).order('id').range(offset,offset+999)
  if(result.error) throw result.error
  walks.push(...result.data)
  if(result.data.length<1000) return walks
 }
}

export async function setWalkDeletion(id: string, deleted: boolean) {
 const result = await db().rpc('set_walk_deleted', { p_walk: id, p_deleted: deleted })
 if (result.error) throw result.error
 // A member removing another author's walk loses SELECT access to the deleted row.
 if(deleted)return
 const verified = await db().from('walks').select('id,deleted_at').eq('id', id).single()
 if (verified.error) throw verified.error
 if ((verified.data.deleted_at !== null) !== deleted) throw new Error('The walk status could not be confirmed. Please retry.')
}

export async function permanentlyDeleteWalk(id:string) {
 const result=await db().rpc('permanently_delete_walk',{p_walk:id})
 if(result.error)throw result.error
}

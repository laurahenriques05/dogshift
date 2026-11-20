import { expect, it, vi } from 'vitest'
const {rpc,from}=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn()}))
vi.mock('../lib/supabase/client',()=>({db:()=>({rpc,from})}))
import { setWalkDeletion } from '../features/walks/api'
it('accepts a successful deletion without reading a row now hidden by deleted-author RLS',async()=>{
 rpc.mockResolvedValueOnce({error:null})
 await expect(setWalkDeletion('family-walk',true)).resolves.toBeUndefined()
 expect(from).not.toHaveBeenCalled()
 rpc.mockResolvedValueOnce({error:{message:'Walker access required'}})
 await expect(setWalkDeletion('family-walk',true)).rejects.toMatchObject({message:'Walker access required'})
})

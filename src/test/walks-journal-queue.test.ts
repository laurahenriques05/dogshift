import {afterEach,it,expect,vi} from 'vitest'
const rpc=vi.hoisted(()=>vi.fn())
vi.mock('../lib/supabase/client',()=>({db:()=>({rpc})}))
import {queueNote,pendingNotes,syncNotesBeforeFinish,mergeJournal} from '../features/walks/noteJournal'
afterEach(()=>vi.unstubAllGlobals())
it('retains pending history on missing schema, rejects network loss and removes entries only after acknowledgement',async()=>{
 const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});vi.stubGlobal('window',new EventTarget())
 const note={id:'82000000-0000-0000-0000-000000000001',walk_id:'walk',text:'Water break',recorded_at:'2026-01-01T10:00:00Z'}
 queueNote('user',note);queueNote('user',note);expect(pendingNotes('user','walk')).toHaveLength(1)
 rpc.mockResolvedValueOnce({error:{code:'PGRST202',message:'Function missing from schema cache'}})
 expect(await syncNotesBeforeFinish('user','walk')).toBe(false);expect(pendingNotes('user','walk')).toHaveLength(1)
 rpc.mockResolvedValueOnce({error:{message:'Failed to fetch'}});await expect(syncNotesBeforeFinish('user','walk')).rejects.toMatchObject({message:'Failed to fetch'})
 rpc.mockResolvedValueOnce({error:null,data:note});expect(await syncNotesBeforeFinish('user','walk')).toBe(true);expect(pendingNotes('user','walk')).toHaveLength(0)
 expect(mergeJournal([note],[{...note,pending:true}])).toEqual([note])
})

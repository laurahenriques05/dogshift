import { expect, it } from 'vitest'
import { readTaskPages } from '../features/tasks/data'

it('loads beyond the API page limit without dropping tasks', async () => {
 const values=Array.from({length:1203},(_,id)=>({id}))
 const calls:Array<[number,number]>=[]
 const rows=await readTaskPages(async (from,to)=>{calls.push([from,to]);return {data:values.slice(from,to+1),error:null}})
 expect(rows).toEqual(values)
 expect(calls).toEqual([[0,499],[500,999],[1000,1499]])
})

it('fails the full load when a later page fails rather than presenting partial success', async () => {
 const failure=new Error('Connection interrupted')
 await expect(readTaskPages(async from=>from===0?{data:Array.from({length:500},(_,id)=>id),error:null}:{data:null,error:failure})).rejects.toBe(failure)
})

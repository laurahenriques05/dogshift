import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({select:vi.fn(),rpc:vi.fn()}))
vi.mock('../lib/supabase/client',()=>({db:()=>({rpc:mocks.rpc,from:(table:string)=>{
 const result=table==='walk_daily_plans'?{data:null,error:null}:{data:[],error:null}
 const builder={select:(columns:string)=>{mocks.select(table,columns);return builder},eq:()=>builder,is:()=>builder,maybeSingle:()=>Promise.resolve(result),order:()=>Promise.resolve(result)}
 return builder
}})}))
import {readDailyWalks,saveDailyCount} from '../features/walks/dailyWalks'
beforeEach(()=>{vi.clearAllMocks();mocks.rpc.mockResolvedValue({error:null})})
it('loads Set routine against the existing schema without solar columns',async()=>{
 expect(await readDailyWalks('dog','2026-11-19')).toEqual({count:undefined,times:[],decided:false,checks:[]})
 expect(mocks.select).toHaveBeenCalledWith('walk_daily_plans','required_count,routine_enabled,estimated_times')
})
it('saves required estimates through the existing location-free RPC and clears times on removal',async()=>{
 await saveDailyCount('dog',2,['09:30','11:30'])
 expect(mocks.rpc).toHaveBeenCalledWith('set_walk_routine',{p_dog:'dog',p_count:2,p_times:['09:30','11:30']})
 await expect(saveDailyCount('dog',2,['09:30',''])).rejects.toThrow('estimated time')
 expect(mocks.rpc).toHaveBeenCalledTimes(1)
 await saveDailyCount('dog',undefined,['09:30'])
 expect(mocks.rpc).toHaveBeenLastCalledWith('set_walk_routine',{p_dog:'dog',p_count:null,p_times:[]})
})

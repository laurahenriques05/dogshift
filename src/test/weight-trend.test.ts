import { expect,it } from 'vitest'
import { weightWindow } from '../features/health/WeightTrend'
it('uses calendar boundaries across leap years, weeks and half years',()=>{
 expect(weightWindow('2024-02-29','Month')).toEqual({start:'2024-02-01',end:'2024-03-01'})
 expect(weightWindow('2026-01-01','Week')).toEqual({start:'2025-12-29',end:'2026-01-05'})
 expect(weightWindow('2026-11-12','6 Months')).toEqual({start:'2026-07-01',end:'2027-01-01'})
 expect(weightWindow('2026-11-12','Year')).toEqual({start:'2026-01-01',end:'2027-01-01'})
 expect(weightWindow('2026-12-31','Day')).toEqual({start:'2026-12-31',end:'2027-01-01'})
})

it('keeps a 35–60 kg reference scale and expands to include outliers', async()=>{
 const {weightScale}=await import('../features/health/WeightTrend')
 expect(weightScale([44.8,45,45.2])).toEqual({min:35,max:60})
 expect(weightScale([])).toEqual({min:35,max:60})
 expect(weightScale([12,65.2])).toEqual({min:10,max:70})
})

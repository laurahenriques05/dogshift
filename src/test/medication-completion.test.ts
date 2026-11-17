import { expect, test } from 'vitest'
import { medicationComplete } from '../features/health/medicationCompletion'

test('archives only schedules with every dose given, and restores them when doses change',()=>{
 expect(medicationComplete([])).toBe(false)
 expect(medicationComplete([{status:'given'},{status:'given'}])).toBe(true)
 expect(medicationComplete([{status:'given'},{status:'scheduled'}])).toBe(false)
 expect(medicationComplete([{status:'given'},{status:'skipped'}])).toBe(false)
})

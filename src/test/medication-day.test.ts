import {describe,it,expect} from 'vitest'
import {canGiveDose} from '../features/health/medicationDay'
describe('medication day',()=>{
 it('allows only the scheduled family-local day',()=>{
  expect(canGiveDose('2026-11-23T12:00Z','Europe/Lisbon','2026-11-23T09:00Z')).toBe(true)
  expect(canGiveDose('2026-11-24T12:00Z','Europe/Lisbon','2026-11-23T09:00Z')).toBe(false)
  expect(canGiveDose('2026-11-22T12:00Z','Europe/Lisbon','2026-11-23T09:00Z')).toBe(false)
 })
 it('uses local dates across midnight and daylight saving',()=>{
  expect(canGiveDose('2026-07-23T23:30Z','Europe/Lisbon','2026-07-24T00:15Z')).toBe(true)
  expect(canGiveDose('2026-07-23T22:30Z','Europe/Lisbon','2026-07-23T23:15Z')).toBe(false)
 })
})

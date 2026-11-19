import {it,expect} from 'vitest'
import {routineNames,validRoutineTimes} from '../features/walks/routineSchedule'
it('names fixed periods with short labels and numbers only when repeated',()=>{
 expect(routineNames(['10:00','14:00','21:00'])).toEqual(['Morning','Afternoon','Night'])
 expect(routineNames(['11:30','09:30','18:00','14:30','23:00','20:00'])).toEqual(['Morning 2','Morning 1','Afternoon 2','Afternoon 1','Night 2','Night 1'])
 expect(routineNames(['09:30','09:30'])).toEqual(['Morning 1','Morning 2'])
})
it('uses 07:00, noon and 20:00 boundaries without location or solar data',()=>{
 expect(routineNames(['06:59','07:00','11:59','12:00','19:59','20:00'])).toEqual(['Night 1','Morning 1','Morning 2','Afternoon 1','Afternoon 2','Night 2'])
 expect(routineNames(['00:00'])).toEqual(['Night'])
})
it('assigns names progressively and excludes missing or invalid times from numbering',()=>{
 expect(routineNames(['','',''])).toEqual(['','',''])
 expect(routineNames(['09:30','',''])).toEqual(['Morning','',''])
 expect(routineNames(['09:30','11:30',''])).toEqual(['Morning 1','Morning 2',''])
 expect(routineNames(['24:00','9:30','20:30'])).toEqual(['','','Night'])
})
it('requires an integer count and valid HH:MM for every configured walk',()=>{
 expect(validRoutineTimes(['09:30','20:00'],2)).toBe(true)
 for(const [times,count]of [[['09:30',''],2],[['9:30'],1],[['24:00'],1],[[],0],[['09:30'],2],[['09:30'],1.5]] as [string[],number][])expect(validRoutineTimes(times,count)).toBe(false)
})

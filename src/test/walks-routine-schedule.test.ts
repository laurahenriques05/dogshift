import {it,expect} from 'vitest'
import {routineNames,sunriseMinutes,validRoutineTimes,routineDeviceLocation} from '../features/walks/routineSchedule'
it('names each period from required estimated times, numbered in time order rather than input order',()=>{
 expect(routineNames(['10:00','14:00','21:00'],450)).toEqual(['Morning Walk','Afternoon Walk','Night Walk'])
 expect(routineNames(['11:30','09:30','18:00','14:30','23:00','20:00'],450)).toEqual(['Morning Walk 2','Morning Walk 1','Afternoon Walk 2','Afternoon Walk 1','Night Walk 2','Night Walk 1'])
 expect(routineNames(['09:30','09:30'],450)).toEqual(['Morning Walk 1','Morning Walk 2'])
})
it('uses sunrise and noon boundaries with a fixed 20:00 night boundary in every season',()=>{
 expect(routineNames(['07:29','07:30','11:59','12:00','19:59','20:00'],450)).toEqual(['Night Walk 1','Morning Walk 1','Morning Walk 2','Afternoon Walk 1','Afternoon Walk 2','Night Walk 2'])
 for(const dawn of [300,480])expect(routineNames(['19:59','20:00'],dawn)).toEqual(['Afternoon Walk','Night Walk'])
})
it('calculates daily Lisbon sunrise approximately, converts daylight saving, handles date lines and never invents polar sunrise',()=>{
 const lisbon={latitude:38.72,longitude:-9.14,label:'Lisbon'}
 const winter=sunriseMinutes('2026-12-21','Europe/Lisbon',lisbon)!,summer=sunriseMinutes('2026-06-21','Europe/Lisbon',lisbon)!
 expect(winter).toBeGreaterThan(7*60+40);expect(winter).toBeLessThan(8*60)
 expect(summer).toBeGreaterThan(6*60);expect(summer).toBeLessThan(6*60+30)
 const leap=sunriseMinutes('2028-02-29','Europe/Lisbon',lisbon)!
 expect(leap).toBeGreaterThan(6*60);expect(leap).toBeLessThan(8*60)
 const beforeDst=sunriseMinutes('2026-03-28','Europe/Lisbon',lisbon)!,afterDst=sunriseMinutes('2026-03-29','Europe/Lisbon',lisbon)!
 expect(afterDst-beforeDst).toBeGreaterThan(50);expect(afterDst-beforeDst).toBeLessThan(65)
 const kiritimati=sunriseMinutes('2026-06-21','Pacific/Kiritimati',{latitude:1.87,longitude:-157.43,label:'Kiritimati'})
 expect(kiritimati).not.toBeNull();expect(kiritimati!).toBeGreaterThan(5*60);expect(kiritimati!).toBeLessThan(8*60)
 expect(sunriseMinutes('2026-12-21','Arctic/Longyearbyen',{latitude:78.2,longitude:15.6,label:'Longyearbyen'})).toBeNull()
 expect(routineNames(['09:30','14:00','21:00'],null)).toEqual(['Walk 1','Afternoon Walk','Night Walk'])
})
it('requires a valid HH:MM for each configured walk',()=>{
 expect(validRoutineTimes(['09:30','20:00'],2)).toBe(true)
 for(const [times,count]of [[['09:30',''],2],[['9:30'],1],[['24:00'],1],[[],0],[['09:30'],2]] as [string[],number][])expect(validRoutineTimes(times,count)).toBe(false)
})

it('keeps only an approximate device location and rejects invalid coordinates',()=>{
 expect(routineDeviceLocation(38.721234,-9.145432)).toEqual({latitude:38.72,longitude:-9.15,label:'Device location'})
 for(const [lat,lon]of [[NaN,0],[91,0],[0,181]])expect(()=>routineDeviceLocation(lat,lon)).toThrow('Invalid device location')
})

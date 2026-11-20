import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {approximateRouteArea,photonAreaName,resolveWalkArea,setAreaConsent,areaConsent} from '../features/walks/walkArea'
import type {Point} from '../features/walks/gps'
const points=[{latitude:38.721234,longitude:-9.145678}] as Point[]
beforeEach(()=>{const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});vi.stubGlobal('window',new EventTarget());vi.stubGlobal('fetch',vi.fn());vi.useFakeTimers()})
afterEach(()=>{setAreaConsent('user',false);vi.useRealTimers();vi.unstubAllGlobals()})
it('uses a real middle sample rounded to two decimals and rejects absent/invalid GPS',()=>{
 expect(approximateRouteArea(points)).toEqual({latitude:38.72,longitude:-9.15})
 expect(approximateRouteArea([{latitude:NaN,longitude:0}])).toBeNull()
 expect(approximateRouteArea([])).toBeNull()
})
it('uses locality/city fields instead of inventing an area from a business or address',()=>{
 expect(photonAreaName({features:[{properties:{district:'Arroios',city:'Lisboa',street:'Private street',housenumber:'8'}}]})).toBe('Arroios, Lisboa')
 expect(photonAreaName({features:[{properties:{name:'Lisboa',osm_key:'place'}}]})).toBe('Lisboa')
 expect(photonAreaName({features:[{properties:{name:'Cafe',osm_key:'amenity',housenumber:'8'}}]})).toBeNull()
 expect(photonAreaName({features:[]})).toBeNull()
})
it('makes no request without account-specific consent',async()=>{
 setAreaConsent('another-user',true)
 expect(areaConsent('user')).toBe(false)
 await expect(resolveWalkArea(points,new AbortController().signal,'user')).rejects.toThrow('Cancelled')
 expect(fetch).not.toHaveBeenCalled()
})
it('sends only one coarse point, caches it in memory and omits credentials/referrers',async()=>{
 setAreaConsent('user',true)
 vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({features:[{properties:{district:'Arroios',city:'Lisboa'}}]})))
 const result=resolveWalkArea(points,new AbortController().signal,'user')
 await vi.advanceTimersByTimeAsync(1000)
 expect(await result).toBe('Arroios, Lisboa')
 const [url,options]=vi.mocked(fetch).mock.calls[0]
 expect(String(url)).toContain('lat=38.72');expect(String(url)).toContain('lon=-9.15');expect(String(url)).not.toContain('38.721234')
 expect(options).toMatchObject({credentials:'omit',referrerPolicy:'no-referrer'})
 expect(await resolveWalkArea(points,new AbortController().signal,'user')).toBe('Arroios, Lisboa')
 expect(fetch).toHaveBeenCalledTimes(1)
})
it('stops queued requests when consent is withdrawn',async()=>{
 setAreaConsent('user',true)
 const result=resolveWalkArea(points,new AbortController().signal,'user').catch(error=>error)
 await Promise.resolve();setAreaConsent('user',false);await vi.advanceTimersByTimeAsync(1000)
 expect(await result).toBeInstanceOf(DOMException)
 expect(fetch).not.toHaveBeenCalled()
})

it('reports provider failure without caching a fabricated area',async()=>{
 setAreaConsent('user',true)
 vi.mocked(fetch).mockResolvedValue(new Response('',{status:503}))
 const result=resolveWalkArea(points,new AbortController().signal,'user').catch(error=>error)
 await vi.advanceTimersByTimeAsync(1000)
 expect(await result).toMatchObject({message:'Area lookup unavailable'})
})

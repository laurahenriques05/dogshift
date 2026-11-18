import { afterEach, describe, expect, it, vi } from 'vitest'
import { dogPlacesQuery, fetchDogPlaces, nearestDogPlaces, parseDogPlaces, searchArea, shouldRefreshPlaces, type PlaceElement } from '../features/walks/dogPlaces'
afterEach(()=>vi.unstubAllGlobals())
describe('mapped dog places (isolated; no real location or network)',()=>{
 it('accepts worldwide nodes and area centres, deduplicates, and rejects invalid/private/non-dog records',()=>{
  const elements:PlaceElement[]=[{type:'node',id:1,lat:-33.86,lon:151.21,tags:{amenity:'veterinary',name:'Vet'}},{type:'way',id:2,center:{lat:35.7,lon:139.7},tags:{leisure:'dog_park'}},{type:'node',id:3,lat:91,lon:0,tags:{shop:'pet'}},{type:'node',id:4,lat:0,lon:0,tags:{shop:'pet',access:'private'}},{type:'node',id:5,lat:0,lon:0,tags:{amenity:'animal_boarding',animal_boarding:'cat'}}]
  expect(parseDogPlaces([...elements,elements[0]]).map(place=>place.id)).toEqual(['node/1','way/2'])
 })
 it('keeps hospital naming distinct without claiming emergency services and treats markup as plain text',()=>{
  const places=parseDogPlaces([{type:'node',id:1,lat:38,lon:-9,tags:{amenity:'veterinary',name:'Veterinary Hospital'}},{type:'node',id:2,lat:38,lon:-9,tags:{amenity:'veterinary',name:'<img src=x onerror=alert(1)>'}}])
  expect(places[0].kind).toBe('Veterinary hospital');expect(places[1].kind).toBe('Veterinary care');expect(places[1].name).toContain('<img')
  expect(places[0]).not.toHaveProperty('emergency')
 })
 it('queries a rounded area rather than uploading an exact fix or GPS route',()=>{
  const point={latitude:38.728765,longitude:-9.143219}
  expect(searchArea(point)).toEqual({latitude:38.73,longitude:-9.14})
  const query=dogPlacesQuery(point)
  expect(query).toContain('around:2000,38.73,-9.14');expect(query).not.toContain('38.728765');expect(query).toContain('out center 100')
  expect(()=>dogPlacesQuery({latitude:NaN,longitude:0})).toThrow('valid')
 })
 it('updates proximity across the date line and excludes distant places',()=>{
  const places=[{id:'node/1',name:'Vet',kind:'Veterinary care',latitude:0,longitude:-179.999},{id:'node/2',name:'Far',kind:'Pet shop',latitude:1,longitude:170}]
  expect(nearestDogPlaces(places,{latitude:0,longitude:179.999}).map(place=>place.id)).toEqual(['node/1'])
  expect(nearestDogPlaces(places,{latitude:10,longitude:10})).toEqual([])
 })
 it('refreshes only after both meaningful movement and the one-minute request interval',()=>{
  const previous={position:{latitude:0,longitude:0},at:1000}
  expect(shouldRefreshPlaces(previous,{latitude:0,longitude:.01},60999)).toBe(false)
  expect(shouldRefreshPlaces(previous,{latitude:0,longitude:.001},61000)).toBe(false)
  expect(shouldRefreshPlaces(previous,{latitude:0,longitude:.01},61000)).toBe(true)
 })
 it('sends only an explicit bounded search and propagates unavailable/incomplete data',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({elements:[]})}).mockResolvedValueOnce({ok:false}).mockResolvedValueOnce({ok:true,json:async()=>({elements:[],remark:'timeout'})})
  vi.stubGlobal('fetch',fetcher);const signal=new AbortController().signal
  expect(await fetchDogPlaces({latitude:38.7,longitude:-9.1},signal)).toEqual([])
  expect(fetcher.mock.calls[0][0]).toBe('https://overpass.private.coffee/api/interpreter')
  expect(fetcher.mock.calls[0][1]).toMatchObject({signal,method:'POST',referrerPolicy:'no-referrer'})
  await expect(fetchDogPlaces({latitude:0,longitude:0},signal)).rejects.toThrow('unavailable')
  await expect(fetchDogPlaces({latitude:0,longitude:0},signal)).rejects.toThrow('fully loaded')
 })
})

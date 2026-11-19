import {it,expect,vi} from 'vitest'
import type {Map as VectorMap} from 'maplibre-gl'
import {applyMapPresentation,motionDuration,MAP_APPROACH_MS,SATELLITE_TILES} from '../features/walks/mapPresentation'
import {recordingStatus} from '../features/walks/recordingStatus'
it('keeps satellite lazy, preserves route sources and toggles actual dog layers and native POI filters',()=>{
 const sources=new Set(['openmaptiles']),layers=new Set(['pawshare-park-labels','dog-places-dot','dog-places-label','walk-dog-tile-dot','walk-dog-tile-label','walk-route-halo'])
 const map={getSource:(id:string)=>sources.has(id),getLayer:(id:string)=>layers.has(id)||id.startsWith('poi'),addSource:vi.fn((id:string)=>sources.add(id)),addLayer:vi.fn((layer:{id:string})=>layers.add(layer.id)),setLayoutProperty:vi.fn(),setPaintProperty:vi.fn(),moveLayer:vi.fn(),setFilter:vi.fn(),easeTo:vi.fn(),getBearing:()=>0,dragRotate:{enable:vi.fn(),disable:vi.fn()},touchZoomRotate:{enableRotation:vi.fn(),disableRotation:vi.fn()}} as unknown as VectorMap
 applyMapPresentation(map,'standard',false)
 expect(map.addSource).not.toHaveBeenCalled()
 vi.mocked(map.easeTo).mockClear();applyMapPresentation(map,'standard',false,false);expect(map.easeTo).not.toHaveBeenCalled()
 expect(map.setFilter).toHaveBeenCalledWith('pawshare-park-labels',expect.arrayContaining([expect.arrayContaining(['!'])]))
 expect(map.setLayoutProperty).toHaveBeenCalledWith('walk-dog-tile-dot','visibility','none')
 applyMapPresentation(map,'3d',true)
 expect(map.setLayoutProperty).toHaveBeenCalledWith('walk-dog-tile-dot','visibility','visible')
 expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({id:'walk-buildings-3d'}),'walk-route-halo')
 applyMapPresentation(map,'satellite',false)
 expect(map.setPaintProperty).toHaveBeenCalledWith('walk-dog-tile-label','text-halo-width',1.8)
 expect(map.setLayoutProperty).toHaveBeenCalledWith('walk-dog-tile-label','text-size',13)
 expect(map.addSource).toHaveBeenCalledWith('walk-satellite',expect.objectContaining({tiles:[SATELLITE_TILES]}))
 expect(map.setLayoutProperty).not.toHaveBeenCalledWith('walk-route-halo','visibility','none')
})
it('uses a slow approach while respecting reduced motion',()=>{expect(MAP_APPROACH_MS).toBe(3000);expect(motionDuration(MAP_APPROACH_MS,false)).toBe(3000);expect(motionDuration(MAP_APPROACH_MS,true)).toBe(0)})
it('reports paused, stale, blocked and offline states without claiming unsynced points are saved',()=>{
 const base={gps:true,tracking:true,paused:false,quality:'good' as const,accuracy:9,lastFix:100000,pending:0,ending:false,online:true,saved:true,now:100001}
 expect(recordingStatus(base).gps).toBe('GPS ±9 m')
 expect(recordingStatus({...base,paused:true}).gps).toBe('GPS paused')
 expect(recordingStatus({...base,quality:'denied'}).gps).toBe('Location blocked')
 expect(recordingStatus({...base,now:140000}).gps).toBe('Finding GPS')
 expect(recordingStatus({...base,pending:3,online:false}).saving).toContain('pending')
 expect(recordingStatus({...base,pending:3,online:false}).footer).not.toContain('is saved')
 expect(recordingStatus({...base,gps:false}).gps).toBe('Time only')
})

it('keeps observed dog places when zoom-out tiles omit POIs, bounded and toggled off with dog layers',async()=>{
 const {retainDogPlacesOnZoomOut}=await import('../features/walks/dogPlaceLayers')
 let zoom=15,enabled=true,features:unknown[]=[{geometry:{type:'Point',coordinates:[-9.15,38.75]},properties:{name:'Mapped vet'}}],idle=()=>{}
 const setData=vi.fn().mockResolvedValue(undefined)
 const map={addSource:vi.fn(),addLayer:vi.fn(),on:(_event:string,callback:()=>void)=>{idle=callback},getZoom:()=>zoom,getCenter:()=>({lng:0,lat:1}),getLayoutProperty:()=>enabled?'visible':'none',querySourceFeatures:()=>features,getSource:()=>({setData})} as unknown as VectorMap
 retainDogPlacesOnZoomOut(map);idle()
 expect(setData).toHaveBeenCalledWith(expect.objectContaining({features:[expect.objectContaining({properties:{name:'Mapped vet'}})]}))
 setData.mockClear();zoom=11;features=[];idle();expect(setData).not.toHaveBeenCalled()
 // The existing source is retained, rather than replaced with empty low-detail tiles.
 enabled=false;zoom=15;features=[{geometry:{type:'Point',coordinates:[1,1]},properties:{name:'Hidden place'}}];idle();expect(setData).not.toHaveBeenCalled()
 expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({id:'walk-dog-retained-label',minzoom:10,maxzoom:16}))
 enabled=true;features=Array.from({length:300},(_,i)=>({geometry:{type:'Point',coordinates:[i/100,1]},properties:{name:`Place ${i}`}}));idle()
 expect(setData.mock.calls.at(-1)![0].features).toHaveLength(250)
 setData.mockClear();idle();expect(setData).not.toHaveBeenCalled()
})

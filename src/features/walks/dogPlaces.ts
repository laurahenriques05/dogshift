import { distance, type Point } from './gps'
import { validLocation } from './startLocation'
export type DogPlace = { id: string; name: string; kind: string; latitude: number; longitude: number }
const categories: Record<string, string> = { veterinary: 'Veterinary care', dog_park: 'Dog park', pet: 'Pet shop', pet_grooming: 'Pet grooming', animal_boarding: 'Pet boarding', animal_shelter: 'Animal shelter', animal_training: 'Animal training' }
export type PlaceElement = { type?: string; id?: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string,string> }
export function parseDogPlaces(elements: PlaceElement[]): DogPlace[] {
 const unique = new Map<string,DogPlace>()
 for (const item of elements) {
  if (!item || typeof item !== 'object') continue
  const tags = Object.fromEntries(Object.entries(item.tags ?? {}).filter((entry): entry is [string,string] => typeof entry[1]==='string')), latitude = item.lat ?? item.center?.lat, longitude = item.lon ?? item.center?.lon
  if (!['node','way','relation'].includes(item.type ?? '') || (!Number.isInteger(item.id) || item.id!<=0) || !validLocation(latitude,longitude) || ['private','no'].includes(tags.access) || tags.dog === 'no') continue
  const key = [tags.amenity,tags.healthcare,tags.leisure,tags.shop].find(value => categories[value])
  if (!key) continue
  if (['animal_boarding','animal_shelter','animal_training'].includes(key) && tags[key] && !tags[key].split(';').includes('dog') && !tags[key].split(';').includes('yes')) continue
  // A hospital label requires the mapped facility's own name; never infer emergency availability.
  const kind = key === 'veterinary' && /hospital|hôpital|krankenhaus/i.test(tags.name ?? '') ? 'Veterinary hospital' : categories[key]
  const place = { id: `${item.type}/${item.id}`, name: (tags['name:en'] || tags.name || kind).slice(0,160), kind, latitude: latitude!, longitude: longitude! }
  unique.set(place.id,place)
 }
 return [...unique.values()]
}
export function searchArea(point: Pick<Point,'latitude'|'longitude'>) {
 return { latitude: Math.round(point.latitude*100)/100, longitude: Math.round(point.longitude*100)/100 }
}
export function dogPlacesQuery(point: Pick<Point,'latitude'|'longitude'>) {
 const area=searchArea(point)
 if (!validLocation(area.latitude,area.longitude)) throw new Error('A valid map position is required.')
 const around=`(around:2000,${area.latitude},${area.longitude})`
 return `[out:json][timeout:20];(nwr["amenity"~"^(veterinary|animal_boarding|animal_shelter|animal_training)$"]${around};nwr["healthcare"="veterinary"]${around};nwr["leisure"="dog_park"]${around};nwr["shop"~"^(pet|pet_grooming)$"]${around};);out center 100;`
}
export async function fetchDogPlaces(point: Pick<Point,'latitude'|'longitude'>, signal: AbortSignal): Promise<DogPlace[]> {
 const response=await fetch('https://overpass.private.coffee/api/interpreter',{method:'POST',body:new URLSearchParams({data:dogPlacesQuery(point)}),signal,referrerPolicy:'no-referrer',credentials:'omit'})
 if (!response.ok) throw new Error('Nearby places are unavailable. Try again later.')
 const result=await response.json()
 if (!Array.isArray(result.elements) || result.remark) throw new Error('Nearby places could not be fully loaded. Please retry.')
 return parseDogPlaces(result.elements)
}
export function nearestDogPlaces(places: DogPlace[], point: Pick<Point,'latitude'|'longitude'>) {
 return places.map(place=>({...place,meters:distance(point,place)})).filter(place=>place.meters<=1200).sort((a,b)=>a.meters-b.meters || a.id.localeCompare(b.id)).slice(0,40)
}

export function shouldRefreshPlaces(previous: {position:Pick<Point,'latitude'|'longitude'>;at:number}, position:Pick<Point,'latitude'|'longitude'>, now:number) {
 return now-previous.at>=60000 && distance(previous.position,position)>=400
}

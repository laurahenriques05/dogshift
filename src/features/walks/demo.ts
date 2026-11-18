import routes from './demoRoutes.json'
import { routeDistance, type Point } from './gps'

export type DemoWalk = { id: string; title: string; location: string; startedAt: string; points: Point[]; meters: number; seconds: number; waste: { pee: number; poop: number } }
/** Presentation fixtures only: never sent to Supabase; available explicitly through the Demo walks history filter; never household statistics. */
export const demoWalks: DemoWalk[] = routes.map(route => {
 const points: Point[] = route.coordinates.map(([longitude, latitude], seq) => ({
  seq, longitude, latitude, accuracy: 3,
  recorded_at: new Date(Date.parse(route.startedAt) + seq * 10_000).toISOString(),
 }))
 const title = route.id === 'walk-alvalade' ? 'Morning adventure' : route.id === 'walk-expo' ? 'Afternoon adventure' : 'Weekend adventure'
 return { ...route, title, points, meters: routeDistance(points), seconds: Math.max(1, points.length - 1) * 10, waste: route.id === 'walk-alvalade' ? { pee: 3, poop: 1 } : route.id === 'walk-expo' ? { pee: 2, poop: 1 } : { pee: 1, poop: 0 } }
})
export const findDemoWalk = (id: string | undefined) => demoWalks.find(walk => walk.id === id?.replace(/^demo-/, 'walk-'))

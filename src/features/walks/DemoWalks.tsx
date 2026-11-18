import { Link } from 'react-router-dom'
import { PageTitle } from '../../components/ui'
import type { DemoWalk } from './demo'
import { RouteMap } from './RouteMap'
import { WalkStats } from './WalkActivityCard'

export function DemoWalkDetail({ walk }: { walk: DemoWalk }) {
 return <div className="walk-page"><Link to="/walks?view=history&status=examples">← Demo walks</Link><PageTitle eyebrow="DEMO WALK" title={walk.title}/>

  <section className="card"><p>{new Date(walk.startedAt).toLocaleString()}</p><WalkStats meters={walk.meters} seconds={walk.seconds}/><RouteMap points={walk.points}/><section className="walk-waste" aria-label="Dog waste summary"><h3>Dog waste</h3><p>{walk.waste.pee} pee · {walk.waste.poop} poop recorded</p></section></section>
 </div>
}

import { Play, Square } from 'lucide-react'
import { Button } from '../../components/ui'
export function RouteMapControls({ playing, onReplay, onFit, disabled, status, live = false }: {
 playing: boolean; onReplay: () => void; onFit: () => void; disabled: boolean; status: string; live?: boolean
}) {
 return <div className="walk-map-tools">
  <div className="walk-map-legend"><span><span className="walk-route-start"/> Start</span>{!playing && <span><span className="walk-route-finish"/> {live ? 'Current position' : 'Finish'}</span>}{!live && <Button className="secondary walk-replay-button" disabled={disabled} onClick={onReplay}>{playing ? <Square size={13}/> : <Play size={14}/>} {playing ? 'Stop replay' : 'Reproduce route'}</Button>}</div>
  <Button className="secondary" onClick={onFit}>{live ? 'Recenter' : 'Fit route'}</Button>
  <span className="sr-only" role="status">{status}</span>
 </div>
}

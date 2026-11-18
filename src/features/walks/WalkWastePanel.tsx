import { PeeIcon, PoopIcon } from './WasteIcons'
import { useEffect, useRef, useState } from 'react'
import { Button, Notice, errorMessage } from '../../components/ui'
import { getWalkWaste, recordWaste, wasteCounts, wastePanelVisible, canRecordWaste, type WasteKind, type WasteMode, type WasteEvent } from './waste'
export function WalkWastePanel({ walkId, own, finished, ending = false, readOnly = false, onRecorded }: { walkId: string; own: boolean; finished: boolean; ending?: boolean; readOnly?: boolean; onRecorded?: () => void }) {
 const [data, setData] = useState<{ mode: WasteMode | null; events: WasteEvent[] } | null>(null)
 const [error, setError] = useState(''), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0)
 const pending = useRef<{ id: string; walk_id: string; kind: WasteKind } | null>(null), locked = useRef(false)
 useEffect(() => {
  let live = true; setData(null); setError('')
  void getWalkWaste(walkId).then(value => { if (live) setData(value) }).catch(e => { if (live) setError(`Dog waste records are unavailable. ${errorMessage(e)}`) })
  return () => { live = false }
 }, [walkId, retry])
 async function add(kind?: WasteKind) {
  if (locked.current) return
  locked.current = true; setBusy(true); setError('')
  try {
   if (!pending.current && kind) pending.current = { id: crypto.randomUUID(), walk_id: walkId, kind }
   if (!pending.current) return
   await recordWaste(pending.current)
   pending.current = null
   setData(await getWalkWaste(walkId)); onRecorded?.()
  } catch (e) { setError(`Could not confirm the saved record. ${errorMessage(e)}`) }
  finally { locked.current = false; setBusy(false) }
 }
 if (!data && !error) return <p role="status">Loading dog waste records…</p>
 if (data && (!data.mode || data.mode === 'off')) return finished ? <p className="muted">Dog waste was not tracked for this walk.</p> : null
 if(data&&!wastePanelVisible(data.mode,finished,ending))return null
 const counts = wasteCounts(data?.events ?? [])
 const canRecord = !!data && canRecordWaste(data.mode,finished,ending,own,readOnly)
 return <section className="walk-waste" aria-label="Dog waste records"><h3>Dog waste</h3>
  {error && <Notice error>{error}<p><Button disabled={busy} className="secondary" onClick={() => pending.current ? void add() : setRetry(v => v + 1)}>Retry records</Button></p></Notice>}
  {data && <><p>{counts.pee} pee · {counts.poop} poop recorded</p>
  {canRecord ? <div className="walk-actions"><Button className="secondary" disabled={busy || !!pending.current} onClick={() => void add('pee')}><PeeIcon/>Pee</Button><Button className="secondary" disabled={busy || !!pending.current} onClick={() => void add('poop')}><PoopIcon/>Poop</Button></div> : !finished && own && <p className="muted">You chose to record dog waste at the end of the walk.</p>}
  {busy && <p role="status">Saving dog waste record…</p>}</>}
 </section>
}

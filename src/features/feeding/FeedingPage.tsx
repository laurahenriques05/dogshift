import { AlertTriangle, Check, Clock3, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Notice, PageTitle, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
import { useAuth } from '../auth/AuthProvider'
import { useHousehold } from '../household/HouseholdProvider'
import { useFeeding } from './useFeeding'
import { formatGrams, regularMeals, stockForecast } from './model'
import { MealChecklist } from './MealChecklist'
import { MealHistory } from './MealHistory'
import { todayChecklist } from './checklist'
import { FeedingRoutineForm } from './FeedingRoutineForm'
import { PlannedMealForm } from './PlannedMealForm'
import { FeedingTagSetup } from './FeedingTagSetup'
import { FoodProductCard } from './FoodProductCard'
import { ProductForm } from './ProductForm'
import { EntryForm } from './EntryForm'
import { FeedingDailyOverview } from './FeedingDailyOverview'
import type { FeedingEntry, FoodProduct, MealEvent } from './types'

type Editor = { type: 'product'; product?: FoodProduct } | { type: 'meal' | 'purchase'; entry?: FeedingEntry; mealId?:string; event?:MealEvent; single?:boolean } | null
type HistoryFilter = 'all'|'meals'|'purchases'|'nfc'
export function FeedingPage() {
 const { household, dog } = useHousehold()
 return <FeedingHousehold key={household!.id} householdId={household!.id} dogName={dog!.name} timezone={household!.timezone}/>
}
function FeedingHousehold({ householdId, dogName, timezone }: { householdId: string; dogName: string; timezone: string }) {
 const data = useFeeding(householdId)
 const { session } = useAuth()
 const [query, setQuery] = useSearchParams()
 const quick = query.get('quick') === '1'
 const targetHousehold = query.get('household')
 const wrongTag = !!targetHousehold && targetHousehold !== householdId
 const [editor, setEditor] = useState<Editor>(quick && !wrongTag ? { type: 'meal' } : null)
 const [routineOpen,setRoutineOpen]=useState(false)
 const [stockOpen,setStockOpen]=useState(false)
 const editorTitle=!editor?'':editor.type==='product'?(editor.product?'Edit food product':'Add food product'):editor.type==='purchase'?'Add a purchase':editor.event?'Correct meal':editor.single?'Record a treat':'Record meal'
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 const [message, setMessage] = useState('')
 const [remove, setRemove] = useState<FeedingEntry | null>(null)
 const [historyLimit, setHistoryLimit] = useState(20)
 const [historyFilter,setHistoryFilter]=useState<HistoryFilter>('all')
 const [now,setNow]=useState(()=>new Date())
 useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),30000);return()=>window.clearInterval(timer)},[])
 const checklist=todayChecklist(data.plan,data.events,timezone,now)
 const next=checklist.find(row=>!row.event)
 const recent=[...data.events].filter(e=>e.outcome!=='skipped').sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at))[0]
 const correctable=[...data.events].filter(event=>event.created_by===session?.user.id).sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at))[0]
 const overdue=checklist.filter(row=>!row.event&&row.minutesLate>=60)
 const lowStock=data.products.map(product=>({product,forecast:stockForecast(product,data.entries)})).filter(item=>item.forecast.low||item.forecast.remaining<=0)
 function editMeal(event:MealEvent){setEditor({type:'meal',event});setMessage('')}
 const names = new Map(data.members.map(m => [m.user_id, m.display_name]))
 const meals = regularMeals(data.entries, data.products)
 const live = data.entries.filter(e => !e.deleted_at&&!e.event_id).sort((a,b) => b.occurred_at.localeCompare(a.occurred_at))
 const filteredEvents=data.events.filter(event=>historyFilter==='all'||historyFilter==='meals'||(historyFilter==='nfc'&&event.source==='nfc')).sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at))
 const filteredLive=live.filter(entry=>historyFilter==='all'||(historyFilter==='purchases'&&entry.kind==='purchase')||(historyFilter==='meals'&&entry.kind==='meal')||(historyFilter==='nfc'&&entry.source==='nfc'))
 const weekStart=now.getTime()-7*86400000
 const weekRecorded=data.events.filter(event=>!event.deleted_at&&new Date(event.occurred_at).getTime()>=weekStart).length
 const setupComplete=data.products.length>0&&data.plan.length>0
 function close() { setEditor(null); setQuery({}, { replace: true }) }
 function saved() { close(); setRemove(null); setMessage('Saved. Your family’s feeding and stock records are up to date.'); data.refresh() }
 async function deleteEntry(entry: FeedingEntry) {
  setBusy(true); setError('')
  try {
   const { error } = await db().rpc('save_feeding_entry', { p_household: householdId, p_id: entry.id, p_product: entry.product_id, p_kind: entry.kind, p_quantity: Number(entry.quantity_grams), p_at: entry.occurred_at, p_delete: true })
   if (error) throw error
   saved()
  } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
 }
 if (data.loading) return <p role="status">Loading feeding and food stock…</p>
 if (data.error) return <><PageTitle eyebrow="YOUR EVERYDAY" title="Feeding"/><Notice error>{data.error}</Notice><Button onClick={data.refresh}>Retry</Button></>
 return <div className="feeding-page"><PageTitle eyebrow="TODAY’S FEEDING" title={`Meals for ${dogName}.`}>Shared with your family, updated as meals are recorded.</PageTitle>
  {wrongTag && <Notice error>This feeding tag belongs to another household. Switch to that household before using its tag.</Notice>}
  {error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}
  {!setupComplete&&<section className="card feeding-setup" aria-labelledby="feeding-setup-title"><p className="eyebrow">QUICK SETUP</p><h2 id="feeding-setup-title">Get ready for daily feeding</h2><p className="muted">Set this up once. Afterwards, recording the right bowl takes only a few seconds.</p><ol><li className={data.products.length?'is-complete':''}><span>{data.products.length?<Check size={16} aria-hidden="true"/>:'1'}</span><div><strong>Add the food you use</strong><small>Enter the current pack or container.</small></div>{!data.products.length&&<Button className="secondary" onClick={()=>setStockOpen(true)}>Add food</Button>}</li><li className={data.plan.length?'is-complete':''}><span>{data.plan.length?<Check size={16} aria-hidden="true"/>:'2'}</span><div><strong>Save the usual meals</strong><small>Add times, foods and portions.</small></div>{data.products.length>0&&!data.plan.length&&<button type="button" className="text-link" onClick={()=>setRoutineOpen(true)}>Set routine</button>}</li><li><span>3</span><div><strong>Feed from Today’s meals</strong><small>Confirm the saved bowl; stock updates automatically.</small></div></li></ol></section>}
  <FeedingDailyOverview dogName={dogName} next={next} recent={recent} correctable={correctable} products={data.products} entries={data.entries} names={names} timezone={timezone} wrongTag={wrongTag} onFeed={()=>{setEditor({type:'meal',mealId:next?.meal.id});setMessage('')}} onPurchase={()=>setEditor({type:'purchase'})} onManageStock={()=>setStockOpen(true)} onTreat={()=>{setEditor({type:'meal',single:true});setMessage('')}} onCorrect={()=>correctable&&editMeal(correctable)} onEditRoutine={()=>setRoutineOpen(true)}/>
  {(overdue.length>0||lowStock.length>0)&&<section className="card feeding-alerts" aria-labelledby="feeding-attention"><div className="feeding-alert-heading"><AlertTriangle size={20} aria-hidden="true"/><div><h2 id="feeding-attention">Action required</h2></div></div><ul>{overdue.map(row=><li key={row.meal.id}><strong>{row.meal.name} overdue</strong><span>Scheduled for {row.meal.time}</span><Button className="secondary" onClick={()=>setEditor({type:'meal',mealId:row.meal.id})}>Record</Button></li>)}{lowStock.map(({product,forecast})=><li key={product.id}><strong>{product.name}: {forecast.remaining<=0?'out of stock':'low stock'}</strong><span>{forecast.days===null?formatGrams(forecast.remaining):`${Number(forecast.days.toFixed(1))} days remaining`}</span><Button className="secondary" onClick={()=>setEditor({type:'purchase'})}>Restock</Button></li>)}</ul></section>}
  {editor && <FeedingModal title={editorTitle} onClose={close}>{editor.type === 'product' ? <ProductForm key={editor.product?.id || 'new-product'} householdId={householdId} product={editor.product} onSaved={saved} onCancel={close}/> : data.products.length && !wrongTag ? editor.type==='meal'&&!editor.entry ? <PlannedMealForm key={editor.event?.id||editor.mealId||(editor.single?'single':'new-meal')} householdId={householdId} products={data.products} plan={data.plan} initialMealId={editor.mealId||next?.meal.id} startSingle={editor.single} event={editor.event} entries={data.entries} source={quick?'nfc':'app'} onSaved={saved} onCancel={close}/> : <EntryForm key={editor.entry?.id || editor.type} householdId={householdId} products={data.products} entries={data.entries} kind={editor.type} entry={editor.entry} source={quick ? 'nfc' : 'app'} names={names} timezone={timezone} onSaved={saved} onCancel={close}/> : <><Notice>Add your first food product before recording a meal.</Notice><Button onClick={() => setEditor({ type: 'product' })}>Add product</Button><Button className="secondary" onClick={close}>Cancel</Button></>}</FeedingModal>}
  {routineOpen&&<FeedingModal title="Edit feeding routine" onClose={()=>setRoutineOpen(false)}><FeedingRoutineForm householdId={householdId} products={data.products} plan={data.plan} count={data.mealsPerDay} warningHours={data.warningHours} timezone={timezone} startEditing onCancel={()=>setRoutineOpen(false)} onSaved={()=>{setRoutineOpen(false);saved()}}/></FeedingModal>}
  {stockOpen&&<FeedingModal title="Food and stock" onClose={()=>setStockOpen(false)}><div className="feeding-stock-manager"><div className="feeding-actions"><Button disabled={!data.products.length} onClick={()=>{setStockOpen(false);setEditor({type:'purchase'})}}>Add purchase</Button><Button className="secondary" onClick={()=>{setStockOpen(false);setEditor({type:'product'})}}>Add food</Button></div>{!data.products.length&&<div className="feeding-empty-state"><h3>No food added yet</h3><p className="muted">Add the food you use and its current quantity to start tracking stock.</p></div>}<div className="feeding-products">{data.products.map(product=><FoodProductCard key={product.id} product={product} entries={data.entries} timezone={timezone} onEdit={()=>{setStockOpen(false);setEditor({type:'product',product})}}/>)}</div></div></FeedingModal>}
  <MealChecklist plan={data.plan} events={data.events} products={data.products} timezone={timezone} names={names} userId={session!.user.id} now={now} onFeed={mealId=>{setEditor({type:'meal',mealId});setMessage('')}} onEdit={editMeal} disabled={wrongTag}/>
  <p className="eyebrow feeding-more-label">RECORDS &amp; SETUP</p>
  <FeedDisclosure title="History" summary={`${weekRecorded} records in the last 7 days`}><section className="feeding-history"><h2 className="feeding-section-heading"><Clock3 size={20} aria-hidden="true"/>Records</h2><p className="muted">Purchases are shared. Feeding records can only be changed by the person who created them.</p><div className="feeding-history-filters" role="group" aria-label="Filter feeding history">{(['all','meals','purchases','nfc'] as HistoryFilter[]).map(filter=><button type="button" key={filter} aria-pressed={historyFilter===filter} onClick={()=>setHistoryFilter(filter)}>{filter[0].toUpperCase()+filter.slice(1)}</button>)}</div><MealHistory events={filteredEvents.slice(0,historyLimit)} entries={data.entries} products={data.products} names={names} timezone={timezone} userId={session!.user.id} onEdit={editMeal}/>
   {!filteredLive.length ? !filteredEvents.length&&<p className="muted">No records match this filter.</p> : <ul className="invitation-list">{filteredLive.slice(0,historyLimit).map(entry => <li key={entry.id}><div><strong>{entry.kind === 'meal' ? 'Fed' : 'Purchased'} · {data.products.find(p => p.id === entry.product_id)?.name}</strong><small>{formatGrams(Number(entry.quantity_grams))}{entry.kind === 'purchase' ? ` · ${entry.packages} × ${formatGrams(Number(entry.package_grams))}` : ''} · {names.get(entry.created_by||'') || 'Former family member'} · {new Date(entry.occurred_at).toLocaleString(undefined, { timeZone: timezone, hour12: false })}{entry.source === 'nfc' ? ' · NFC' : ''}</small></div>{(entry.kind === 'purchase' || entry.created_by === session?.user.id) && <div className="feeding-actions"><Button className="secondary" onClick={() => setEditor({ type: entry.kind, entry })}>Edit</Button><Button className="secondary" onClick={() => setRemove(entry)}>Remove</Button></div>}</li>)}</ul>}{(filteredLive.length>historyLimit||filteredEvents.length>historyLimit) && <Button className="secondary" onClick={() => setHistoryLimit(n => n+20)}>Show more</Button>}
   {remove && <div className="feeding-editor"><Notice>Remove this {remove.kind === 'meal' ? 'feeding' : 'purchase'} record? Stock will be recalculated. Removing a purchase is blocked if it would leave negative stock.</Notice><div className="feeding-actions"><Button disabled={busy} onClick={() => void deleteEntry(remove)}>Confirm removal</Button><Button className="secondary" disabled={busy} onClick={() => setRemove(null)}>Cancel</Button></div></div>}
  </section></FeedDisclosure>
  <div id="feeding-nfc"><FeedDisclosure title="NFC tag" summary="Configure or replace the household feeding tag"><FeedingTagSetup householdId={householdId}/></FeedDisclosure></div>
 </div>
}

function FeedDisclosure({title,summary,children}:{title:string;summary:string;children:ReactNode}) {
 return <details className="feeding-disclosure"><summary><span>{title}</span><small>{summary}</small></summary><div className="feeding-disclosure-body">{children}</div></details>
}

function FeedingModal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const element=dialog.current;if(element&&!element.open)element.showModal()},[])
 return <dialog ref={dialog} className="feeding-modal" aria-labelledby="feeding-modal-title" onCancel={event=>{event.preventDefault();onClose()}} onClick={event=>{if(event.target===event.currentTarget)onClose()}}>
  <div className="feeding-modal-panel">
   <header><div><p className="eyebrow">QUICK ACTION</p><h2 id="feeding-modal-title">{title}</h2></div><button type="button" className="feeding-modal-close" aria-label="Close" onClick={onClose}><X aria-hidden="true"/></button></header>
   <div className="feeding-modal-body">{children}</div>
  </div>
 </dialog>
}

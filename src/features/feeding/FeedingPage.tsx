import { AlertTriangle, Clock3, PackageOpen, Utensils } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Notice, PageTitle, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
import { useAuth } from '../auth/AuthProvider'
import { useHousehold } from '../household/HouseholdProvider'
import { useFeeding } from './useFeeding'
import { countMealEvents, dayKey, formatGrams, regularMeals, stockForecast } from './model'
import { MealChecklist } from './MealChecklist'
import { MealHistory } from './MealHistory'
import { todayChecklist, outcomeLabels } from './checklist'
import { FeedingRoutineForm } from './FeedingRoutineForm'
import { PlannedMealForm } from './PlannedMealForm'
import { FeedingTagSetup } from './FeedingTagSetup'
import { FoodProductCard } from './FoodProductCard'
import { ProductForm } from './ProductForm'
import { EntryForm } from './EntryForm'
import type { FeedingEntry, FoodProduct, MealEvent } from './types'

type Editor = { type: 'product'; product?: FoodProduct } | { type: 'meal' | 'purchase'; entry?: FeedingEntry; mealId?:string; event?:MealEvent } | null
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
 const editorRef=useRef<HTMLElement>(null)
 useEffect(()=>{if(editor&&!data.loading)editorRef.current?.focus()},[editor,data.loading])
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
 const overdue=checklist.filter(row=>!row.event&&row.minutesLate>=60)
 const lowStock=data.products.map(product=>({product,forecast:stockForecast(product,data.entries)})).filter(item=>item.forecast.low||item.forecast.remaining<=0)
 const recorded=data.plan.length?checklist.filter(row=>row.event).length:countMealEvents(regularMeals(data.entries,data.products).filter(e=>dayKey(e.occurred_at,timezone)===dayKey(now,timezone)))
 function editMeal(event:MealEvent){setEditor({type:'meal',event});setMessage('')}
 const names = new Map(data.members.map(m => [m.user_id, m.display_name]))
 const meals = regularMeals(data.entries, data.products)
 const today = meals.filter(e => dayKey(e.occurred_at, timezone) === dayKey(new Date(), timezone))
 const live = data.entries.filter(e => !e.deleted_at&&!e.event_id).sort((a,b) => b.occurred_at.localeCompare(a.occurred_at))
 const filteredEvents=data.events.filter(event=>historyFilter==='all'||historyFilter==='meals'||(historyFilter==='nfc'&&event.source==='nfc')).sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at))
 const filteredLive=live.filter(entry=>historyFilter==='all'||(historyFilter==='purchases'&&entry.kind==='purchase')||(historyFilter==='meals'&&entry.kind==='meal')||(historyFilter==='nfc'&&entry.source==='nfc'))
 const weekStart=now.getTime()-7*86400000
 const weekRecorded=data.events.filter(event=>!event.deleted_at&&new Date(event.occurred_at).getTime()>=weekStart).length
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
 return <div className="feeding-page"><PageTitle eyebrow="FEEDING" title={`${dogName}’s meals`}>Plan meals, record feeding and monitor food stock.</PageTitle>
  {wrongTag && <Notice error>This feeding tag belongs to another household. Switch to that household before using its tag.</Notice>}
  {error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}
  <section className="card feeding-overview"><div className="feeding-overview-main"><p className="eyebrow feeding-overview-label"><Utensils size={15} aria-hidden="true"/>TODAY</p><h2>{next?`${next.status==='Due'?'Due now':'Next'}: ${next.meal.name} at ${next.meal.time}`:data.plan.length?'All planned meals recorded':'No routine configured'}</h2><div className="feeding-today-metrics"><div><strong>{recorded}/{data.mealsPerDay}</strong><span>Meals</span></div><div><strong>{formatGrams(today.reduce((sum,e) => sum+Number(e.quantity_grams),0))}</strong><span>Food served</span></div><div><strong>{lowStock.length}</strong><span>Stock warnings</span></div></div><p className="muted">{recent ? `Last record: ${recent.meal_name} · ${outcomeLabels[recent.outcome]} · ${names.get(recent.created_by||'')||'family member'} · ${new Date(recent.occurred_at).toLocaleTimeString(undefined,{timeZone:timezone,hour:'2-digit',minute:'2-digit',hour12:false})}` : meals[0] ? `Last feeding: ${new Date(meals[0].occurred_at).toLocaleString(undefined,{timeZone:timezone,hour12:false})}` : 'No feeding recorded yet.'}</p></div><div className="feeding-actions"><Button disabled={!data.products.length || wrongTag} onClick={() => { setEditor({ type: 'meal',mealId:next?.meal.id }); setMessage('') }}>{next?'Feed next meal':'Record feeding'}</Button><Button className="secondary" disabled={!data.products.length} onClick={() => setEditor({ type: 'purchase' })}>Record purchase</Button><Button className="secondary" onClick={data.refresh}>Refresh</Button></div></section>
  {(overdue.length>0||lowStock.length>0)&&<section className="card feeding-alerts" aria-labelledby="feeding-attention"><div className="feeding-alert-heading"><AlertTriangle size={20} aria-hidden="true"/><div><h2 id="feeding-attention">Action required</h2></div></div><ul>{overdue.map(row=><li key={row.meal.id}><strong>{row.meal.name} overdue</strong><span>Scheduled for {row.meal.time}</span><Button className="secondary" onClick={()=>setEditor({type:'meal',mealId:row.meal.id})}>Record</Button></li>)}{lowStock.map(({product,forecast})=><li key={product.id}><strong>{product.name}: {forecast.remaining<=0?'out of stock':'low stock'}</strong><span>{forecast.days===null?formatGrams(forecast.remaining):`${Number(forecast.days.toFixed(1))} days remaining`}</span><Button className="secondary" onClick={()=>setEditor({type:'purchase'})}>Restock</Button></li>)}</ul></section>}
  {editor && <section className="card feeding-editor" ref={editorRef} tabIndex={-1}>{editor.type === 'product' ? <ProductForm key={editor.product?.id || 'new-product'} householdId={householdId} product={editor.product} onSaved={saved} onCancel={close}/> : data.products.length && !wrongTag ? editor.type==='meal'&&!editor.entry ? <PlannedMealForm key={editor.event?.id||editor.mealId||'new-meal'} householdId={householdId} products={data.products} plan={data.plan} initialMealId={editor.mealId||next?.meal.id} event={editor.event} entries={data.entries} source={quick?'nfc':'app'} onSaved={saved} onCancel={close}/> : <EntryForm key={editor.entry?.id || editor.type} householdId={householdId} products={data.products} entries={data.entries} kind={editor.type} entry={editor.entry} source={quick ? 'nfc' : 'app'} names={names} timezone={timezone} onSaved={saved} onCancel={close}/> : <><Notice>Add your first food product before recording a meal.</Notice><Button onClick={() => setEditor({ type: 'product' })}>Add product</Button><Button className="secondary" onClick={close}>Cancel</Button></>}</section>}
  <MealChecklist plan={data.plan} events={data.events} products={data.products} timezone={timezone} names={names} userId={session!.user.id} now={now} onFeed={mealId=>{setEditor({type:'meal',mealId});setMessage('')}} onEdit={editMeal} disabled={wrongTag}/>
  <FeedDisclosure title="Daily feeding routine" summary={data.plan.length?`${data.plan.length} planned meals · ${timezone}`:'Not configured'}><FeedingRoutineForm householdId={householdId} products={data.products} plan={data.plan} count={data.mealsPerDay} warningHours={data.warningHours} timezone={timezone} onSaved={saved}/></FeedDisclosure>
  <FeedDisclosure title="Stock" summary={data.products.length?`${data.products.length} products · ${lowStock.length?`${lowStock.length} warnings`:'no warnings'}`:'No products'}><div className="feeding-disclosure-actions"><h2 className="feeding-section-heading"><PackageOpen size={20} aria-hidden="true"/>Products</h2><Button className="secondary" onClick={() => setEditor({ type: 'product' })}>Add product</Button></div>{!data.products.length && <section className="card"><h3>No food products</h3><p className="muted">Add a product and its current quantity before recording meals.</p></section>}<div className="feeding-products">{data.products.map(product=><FoodProductCard key={product.id} product={product} entries={data.entries} timezone={timezone} onEdit={()=>setEditor({type:'product',product})}/>)}</div></FeedDisclosure>
  <FeedDisclosure title="History" summary={`${weekRecorded} records in the last 7 days`}><section className="feeding-history"><h2 className="feeding-section-heading"><Clock3 size={20} aria-hidden="true"/>Records</h2><p className="muted">Purchases are shared. Feeding records can only be changed by the person who created them.</p><div className="feeding-history-filters" role="group" aria-label="Filter feeding history">{(['all','meals','purchases','nfc'] as HistoryFilter[]).map(filter=><button type="button" key={filter} aria-pressed={historyFilter===filter} onClick={()=>setHistoryFilter(filter)}>{filter[0].toUpperCase()+filter.slice(1)}</button>)}</div><MealHistory events={filteredEvents.slice(0,historyLimit)} entries={data.entries} products={data.products} names={names} timezone={timezone} userId={session!.user.id} onEdit={editMeal}/>
   {!filteredLive.length ? !filteredEvents.length&&<p className="muted">No records match this filter.</p> : <ul className="invitation-list">{filteredLive.slice(0,historyLimit).map(entry => <li key={entry.id}><div><strong>{entry.kind === 'meal' ? 'Fed' : 'Purchased'} · {data.products.find(p => p.id === entry.product_id)?.name}</strong><small>{formatGrams(Number(entry.quantity_grams))}{entry.kind === 'purchase' ? ` · ${entry.packages} × ${formatGrams(Number(entry.package_grams))}` : ''} · {names.get(entry.created_by||'') || 'Former family member'} · {new Date(entry.occurred_at).toLocaleString(undefined, { timeZone: timezone, hour12: false })}{entry.source === 'nfc' ? ' · NFC' : ''}</small></div>{(entry.kind === 'purchase' || entry.created_by === session?.user.id) && <div className="feeding-actions"><Button className="secondary" onClick={() => setEditor({ type: entry.kind, entry })}>Edit</Button><Button className="secondary" onClick={() => setRemove(entry)}>Remove</Button></div>}</li>)}</ul>}{(filteredLive.length>historyLimit||filteredEvents.length>historyLimit) && <Button className="secondary" onClick={() => setHistoryLimit(n => n+20)}>Show more</Button>}
   {remove && <div className="feeding-editor"><Notice>Remove this {remove.kind === 'meal' ? 'feeding' : 'purchase'} record? Stock will be recalculated. Removing a purchase is blocked if it would leave negative stock.</Notice><div className="feeding-actions"><Button disabled={busy} onClick={() => void deleteEntry(remove)}>Confirm removal</Button><Button className="secondary" disabled={busy} onClick={() => setRemove(null)}>Cancel</Button></div></div>}
  </section></FeedDisclosure>
  <FeedDisclosure title="NFC tag" summary="Configure or replace the household feeding tag"><FeedingTagSetup householdId={householdId}/></FeedDisclosure>
 </div>
}

function FeedDisclosure({title,summary,children}:{title:string;summary:string;children:ReactNode}) {
 return <details className="feeding-disclosure"><summary><span>{title}</span><small>{summary}</small></summary><div className="feeding-disclosure-body">{children}</div></details>
}

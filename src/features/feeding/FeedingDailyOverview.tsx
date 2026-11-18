import { ArrowRight, Bone, CalendarDays, Nfc, PackageOpen, Pencil, Smartphone, Soup } from 'lucide-react'
import { Button } from '../../components/ui'
import { formatGrams, stockForecast } from './model'
import type { FeedingEntry, FoodProduct, MealEvent, PlannedMeal } from './types'

type ChecklistRow = { meal:PlannedMeal; event:MealEvent|undefined; status:string; minutesLate:number }

export function FeedingDailyOverview({dogName,next,recent,correctable,products,entries,names,timezone,wrongTag,onFeed,onPurchase,onManageStock,onTreat,onCorrect,onEditRoutine}:{
 dogName:string
 next?:ChecklistRow
 recent?:MealEvent
 correctable?:MealEvent
 products:FoodProduct[]
 entries:FeedingEntry[]
 names:Map<string,string>
 timezone:string
 wrongTag:boolean
 onFeed:()=>void
 onPurchase:()=>void
 onManageStock:()=>void
 onTreat:()=>void
 onCorrect:()=>void
 onEditRoutine:()=>void
}) {
 const featuredId=next?.meal.items[0]?.product_id||products[0]?.id
 const featured=products.find(product=>product.id===featuredId)||products[0]
 const forecast=featured?stockForecast(featured,entries):null
 const bowl=next?.meal.items.map(item=>`${formatGrams(Number(item.quantity_grams))} ${products.find(product=>product.id===item.product_id)?.name||'food'}`).join(' + ')
 const recentTime=recent?new Date(recent.occurred_at).toLocaleTimeString(undefined,{timeZone:timezone,hour:'2-digit',minute:'2-digit',hour12:false}):''
 return <div className="feeding-daily-grid">
  <section className="card feeding-next-card" aria-labelledby="feeding-next-title">
   <div className="feeding-next-copy"><p className="eyebrow">NEXT MEAL</p><h2 id="feeding-next-title">{next?`${next.meal.name} · ${next.status==='Due'?'due now':`at ${next.meal.time}`}`:'All planned meals recorded'}</h2><p className="feeding-next-bowl">{bowl||'The next saved bowl will appear here.'}</p>
    <Button disabled={!products.length||wrongTag||!next} onClick={onFeed}>{next?`Feed ${next.meal.name}`:'Record a meal'}<ArrowRight size={18} aria-hidden="true"/></Button>
    <p className="feeding-last-meal">{recent?`Last meal: ${recent.meal_name} at ${recentTime} · recorded by ${names.get(recent.created_by||'')||'family member'}`:`No meal has been recorded for ${dogName} yet.`}</p>
   </div>
   <div className="feeding-nfc-scene" role="img" aria-label="Food bowl with an NFC tag beside a mobile phone">
    <Soup className="feeding-nfc-scene-bowl" aria-hidden="true"/>
    <span className="feeding-nfc-scene-tag"><Nfc aria-hidden="true"/></span>
    <Nfc className="feeding-nfc-scene-signal" aria-hidden="true"/>
    <Smartphone className="feeding-nfc-scene-phone" aria-hidden="true"/>
   </div>
  </section>
  <aside className="feeding-side-stack">
   <section className="card feeding-stock-snapshot"><div className="feeding-stock-title"><PackageOpen size={20} aria-hidden="true"/><h2>Food stock</h2></div>{featured&&forecast?<><strong>{featured.name}</strong><p className="feeding-stock-value">{formatGrams(forecast.remaining)} left</p><p className="muted">{forecast.days===null?'Add daily use to estimate how long it will last.':`About ${Math.max(0,Math.ceil(forecast.days))} days`}</p><div className="feeding-stock-bar" aria-label={`${featured.name} stock status`}><span className={forecast.low?'is-low':''} style={{width:`${Math.min(100,Math.max(4,forecast.days===null?60:forecast.days/Math.max(featured.reminder_days*2,14)*100))}%`}}/></div><div className="feeding-inline-actions"><button type="button" className="feeding-inline-action" onClick={onPurchase}>Add purchase</button><button type="button" className="feeding-inline-action" onClick={onManageStock}>Manage food</button></div></>:<><p className="muted">Add the food you use to start tracking stock.</p><button type="button" className="feeding-inline-action" onClick={onManageStock}>Add food</button></>}</section>
   <section className="card feeding-quick-actions"><h2>Quick actions</h2><div><button type="button" onClick={onTreat}><Bone aria-hidden="true"/><span>Record treat</span></button><button type="button" disabled={!correctable} onClick={onCorrect}><Pencil aria-hidden="true"/><span>Correct a meal</span></button><button type="button" onClick={onEditRoutine}><CalendarDays aria-hidden="true"/><span>Edit routine</span></button></div></section>
  </aside>
 </div>
}

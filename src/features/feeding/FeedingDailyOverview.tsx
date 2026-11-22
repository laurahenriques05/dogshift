import { ArrowRight, Bone, CalendarDays, Nfc, PackageOpen, Pencil } from 'lucide-react'
import { Button } from '../../components/ui'
import { formatGrams, stockForecast } from './model'
import type { FeedingEntry, FoodProduct, MealEvent, PlannedMeal } from './types'

type ChecklistRow = { meal:PlannedMeal; event:MealEvent|undefined; status:string; minutesLate:number }

export function FeedingDailyOverview({dogName,next,recent,correctable,products,entries,names,timezone,wrongTag,mealCount,recordedCount,onFeed,onPurchase,onManageStock,onTreat,onCorrect,onEditRoutine,onSetupTag}:{
 dogName:string
 next?:ChecklistRow
 recent?:MealEvent
 correctable?:MealEvent
 products:FoodProduct[]
 entries:FeedingEntry[]
 names:Map<string,string>
 timezone:string
 wrongTag:boolean
 mealCount:number
 recordedCount:number
 onFeed:()=>void
 onPurchase:()=>void
 onManageStock:()=>void
 onTreat:()=>void
 onCorrect:()=>void
 onEditRoutine:()=>void
 onSetupTag:()=>void
}) {
 const featuredId=next?.meal.items[0]?.product_id||products[0]?.id
 const featured=products.find(product=>product.id===featuredId)||products[0]
 const forecast=featured?stockForecast(featured,entries):null
 const bowl=next?.meal.items.map(item=>`${formatGrams(Number(item.quantity_grams))} ${products.find(product=>product.id===item.product_id)?.name||'food'}`).join(' + ')
 const recentTime=recent?new Date(recent.occurred_at).toLocaleTimeString(undefined,{timeZone:timezone,hour:'2-digit',minute:'2-digit',hour12:false}):''
 const completion=mealCount?recordedCount/mealCount*100:0
 return <div className="feeding-control-layout">
  <section className="card feeding-control-card" aria-labelledby="feeding-next-title">
   <div className="feeding-next-copy"><p className="eyebrow">NEXT MEAL</p><h2 id="feeding-next-title">{next?`${next.meal.name} · ${next.status==='Due'?'due now':`at ${next.meal.time}`}`:'All planned meals recorded'}</h2><p className="feeding-next-bowl">{bowl||'The next saved bowl will appear here.'}</p>
    <Button disabled={!products.length||wrongTag||!next} onClick={onFeed}>{next?`Feed ${next.meal.name}`:'Record a meal'}<ArrowRight size={18} aria-hidden="true"/></Button>
   </div>
   <div className="feeding-control-progress" aria-label={`${recordedCount} of ${mealCount} meals recorded`}>
    <p><strong>{recordedCount}</strong><span>of {mealCount} meals</span></p>
    <span className="feeding-control-meter"><i style={{width:`${completion}%`}}/></span>
    <small>{recent?`Last: ${recent.meal_name} at ${recentTime} · ${names.get(recent.created_by||'')||'family member'}`:`No meal recorded for ${dogName} yet.`}</small>
   </div>
   <svg className="feeding-nfc-bowl-sticker" viewBox="0 0 420 240" role="img" aria-label={`NFC sticker attached to ${dogName}'s food bowl, with a phone ready to tap`}>
    <path className="feeding-nfc-ground" d="M38 185c44-29 105-38 178-24 68 13 124 11 172-8v55H38z"/>
    <path className="feeding-nfc-outline" d="M75 105h177c-4 58-36 91-88 91s-84-33-89-91zM94 196h139"/>
    <text className="feeding-nfc-dog-name" x="106" y="144">{dogName.slice(0,8).toUpperCase()}</text>
    <circle className="feeding-nfc-sticker" cx="231" cy="157" r="35"/>
    <path className="feeding-nfc-mark" d="M218 165c9-7 9-20 0-27M226 172c15-11 15-30 0-40M234 178c18-13 18-37 0-50"/>
   <g className="feeding-nfc-phone"><rect className="feeding-nfc-outline" x="316" y="61" width="58" height="111" rx="12"/><circle className="feeding-nfc-phone-dot" cx="345" cy="155" r="3"/></g>
   <path className="feeding-nfc-phone-signal" d="M283 111c9 9 9 24 0 33M292 102c15 15 15 36 0 51"/>
   </svg>
   <button type="button" className="feeding-nfc-setup-toggle" aria-controls="feeding-nfc" onClick={onSetupTag}><Nfc size={16} aria-hidden="true"/>Set up feeding tag</button>
  </section>
  <div className="feeding-control-details">
   <section className="card feeding-stock-snapshot"><div className="feeding-stock-title"><PackageOpen size={20} aria-hidden="true"/><h2>Food stock</h2></div>{featured&&forecast?<><strong>{featured.name}</strong><p className="feeding-stock-value">{formatGrams(forecast.remaining)} left</p><p className="muted">{forecast.days===null?'Add daily use to estimate how long it will last.':`About ${Math.max(0,Math.ceil(forecast.days))} days`}</p><div className="feeding-stock-bar" aria-label={`${featured.name} stock status`}><span className={forecast.low?'is-low':''} style={{width:`${Math.min(100,Math.max(4,forecast.days===null?60:forecast.days/Math.max(featured.reminder_days*2,14)*100))}%`}}/></div><div className="feeding-inline-actions"><button type="button" className="feeding-inline-action" onClick={onPurchase}>Add purchase</button><button type="button" className="feeding-inline-action" onClick={onManageStock}>Manage food</button></div></>:<><p className="muted">Add the food you use to start tracking stock.</p><button type="button" className="feeding-inline-action" onClick={onManageStock}>Add food</button></>}</section>
   <section className="card feeding-quick-actions"><h2>Quick actions</h2><div><button type="button" onClick={onTreat}><Bone aria-hidden="true"/><span>Record treat</span></button><button type="button" disabled={!correctable} onClick={onCorrect}><Pencil aria-hidden="true"/><span>Correct a meal</span></button><button type="button" onClick={onEditRoutine}><CalendarDays aria-hidden="true"/><span>Edit routine</span></button></div></section>
  </div>
 </div>
}

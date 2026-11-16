import { ChevronDown } from 'lucide-react'
import type { HistoryPeriod } from './history'

const labels = { day: 'Today', week: 'This week', month: 'This month', year: 'This year' } as const

export function WalkPeriodSelect({value, onChange, label}: {value: HistoryPeriod; onChange: (period: HistoryPeriod) => void; label: string}) {
 return <span className="walk-period-select"><select aria-label={label} value={value} onChange={event=>onChange(event.target.value as HistoryPeriod)}>{Object.entries(labels).map(([period,text])=><option key={period} value={period}>{text}</option>)}</select><span className="walk-period-value" aria-hidden="true">{labels[value]}</span><ChevronDown aria-hidden="true" size={16}/></span>
}

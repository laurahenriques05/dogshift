import { WalkFilterSelect } from './WalkFilterSelect'
import type { HistoryPeriod } from './history'

const labels = { day: 'Today', week: 'This week', month: 'This month', year: 'This year' } as const

export function WalkPeriodSelect({value, onChange, label}: {value: HistoryPeriod; onChange: (period: HistoryPeriod) => void; label: string}) {
 return <WalkFilterSelect label={label} value={value} options={Object.entries(labels).map(([value,label])=>({value,label}))} onChange={value=>onChange(value as HistoryPeriod)}/>
}

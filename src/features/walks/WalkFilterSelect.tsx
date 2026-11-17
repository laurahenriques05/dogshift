import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

type Option = { value: string; label: string }
export function WalkFilterSelect({ value, options, label, onChange, className = '' }: { value: string; options: readonly Option[]; label: string; onChange: (value: string) => void; className?: string }) {
 const [open, setOpen] = useState(false)
 const host = useRef<HTMLSpanElement>(null), trigger = useRef<HTMLButtonElement>(null), initialFocus = useRef(0)
 const id = useId(), selected = options.findIndex(option => option.value === value)
 useEffect(() => {
  if (!open) return
  host.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[initialFocus.current]?.focus()
  const outside = (event: PointerEvent) => { if (event.target instanceof Node && !host.current?.contains(event.target)) setOpen(false) }
  document.addEventListener('pointerdown', outside)
  return () => document.removeEventListener('pointerdown', outside)
 }, [open])
 function show(index = Math.max(0, selected)) { initialFocus.current = index; setOpen(true) }
 function close() { setOpen(false); trigger.current?.focus() }
 return <span ref={host} className={`walk-period-select walk-filter-select ${className}`} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
  <button ref={trigger} type="button" id={`${id}-trigger`} className="walk-filter-trigger" aria-label={`${label}: ${options[selected]?.label ?? ''}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} onClick={() => open ? close() : show()} onKeyDown={event => {
   if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show() }
  }}><span>{options[selected]?.label}</span><ChevronDown size={16} aria-hidden="true"/></button>
  {open && <div role="listbox" id={`${id}-list`} aria-labelledby={`${id}-trigger`} className="walk-filter-menu" onKeyDown={event => {
   const items = Array.from(host.current!.querySelectorAll<HTMLButtonElement>('[role="option"]'))
   const index = items.indexOf(document.activeElement as HTMLButtonElement)
   const next = event.key === 'ArrowDown' ? (index + 1) % items.length : event.key === 'ArrowUp' ? (index - 1 + items.length) % items.length : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null
   if (next !== null) { event.preventDefault(); items[next]?.focus() }
   if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
   if (event.key === 'Tab') { trigger.current?.focus(); setOpen(false) }
  }}>{options.map(option => <button type="button" key={option.value} role="option" tabIndex={-1} aria-selected={option.value === value} className="walk-filter-option" onClick={() => { onChange(option.value); close() }}><span>{option.label}</span>{option.value === value && <Check size={14} aria-hidden="true"/>}</button>)}</div>}
 </span>
}

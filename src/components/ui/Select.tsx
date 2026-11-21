import { useEffect, useId, useLayoutEffect, useRef, useState, type SelectHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

type Option = { value: string; label: string; disabled: boolean }
/** Keeps the real select as the form/validation contract; the visible picker shares our app palette. */
export function Select({ children, className = '', autoFocus, onChange, onInvalid, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
 const native = useRef<HTMLSelectElement>(null), trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null)
 const id = useId(), [open, setOpen] = useState(false), [options, setOptions] = useState<Option[]>([])
 const [selected, setSelected] = useState(''), [label, setLabel] = useState(props['aria-label'] || '')
 const [invalid, setInvalid] = useState(false)
 const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 240 })
 const search = useRef({ text: '', time: 0 })
 function sync() {
  const select = native.current
  if (!select) return
  setOptions(Array.from(select.options, option => ({ value: option.value, label: option.label, disabled: option.disabled || !!option.closest('optgroup:disabled') })))
  setSelected(select.value)
  setLabel(props['aria-label'] || Array.from(select.labels || [], item => {
   const copy = item.cloneNode(true) as HTMLElement
   copy.querySelectorAll('.app-select').forEach(control => control.remove())
   return copy.textContent?.trim() || ''
  }).join(' ') || props.name || 'Choose an option')
 }
 useEffect(sync, [children, props.value, props.defaultValue, props['aria-label'], props.name])
 useEffect(() => { if (props.disabled) setOpen(false) }, [props.disabled])
 useEffect(() => {
  const form = native.current?.form
  const reset = () => { setOpen(false); setInvalid(false); queueMicrotask(sync) }
  form?.addEventListener('reset', reset)
  return () => form?.removeEventListener('reset', reset)
 })
 function close() { setOpen(false); trigger.current?.focus() }
 function show() { if (!native.current?.matches(':disabled')) { sync(); setOpen(true) } }
 useLayoutEffect(() => {
  if (!open) return
  const rect = trigger.current!.getBoundingClientRect(), below = window.innerHeight - rect.bottom - 12, above = rect.top - 12
  const height = Math.min(280, Math.max(below, above))
  setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)), top: below >= Math.min(280, above) ? rect.bottom + 6 : rect.top - height - 6, width: rect.width, maxHeight: height })
  const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])
  ;(items.find(item => item.dataset.value === native.current?.value) || items[0])?.focus()
  const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false) }
  const resize = () => setOpen(false)
  document.addEventListener('pointerdown', outside)
  window.addEventListener('resize', resize)
  return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', resize) }
 }, [open])
 const current = options.find(option => option.value === selected)
 return <span className={`app-select ${className}`}>
  <select {...props} ref={native} className="app-select-native" aria-hidden="true" tabIndex={-1} onFocus={() => trigger.current?.focus()} onChange={event => { setInvalid(false); setSelected(event.target.value); onChange?.(event) }} onInvalid={event => {
   onInvalid?.(event); event.preventDefault(); setInvalid(true)
   if (!native.current?.form || native.current.form.querySelector('input:invalid,select:invalid,textarea:invalid') === native.current) { trigger.current?.focus(); show() }
  }}>{children}</select>
  <button ref={trigger} type="button" autoFocus={autoFocus} className="app-select-trigger" disabled={props.disabled} aria-label={`${label}: ${current?.label || ''}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-options` : undefined} aria-describedby={[props['aria-describedby'], invalid ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined} aria-invalid={invalid || props['aria-invalid']} onClick={() => open ? close() : show()} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show() } }}><span>{current?.label || 'Choose…'}</span><ChevronDown size={16} aria-hidden="true"/></button>
  {invalid && <small className="app-select-error" id={`${id}-error`} role="alert">Choose an option.</small>}
  {open && createPortal(<div ref={menu} id={`${id}-options`} className="app-select-menu" role="listbox" aria-label={label} style={{ position: 'fixed', ...position }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }} onKeyDown={event => {
   const items = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')), index = items.indexOf(document.activeElement as HTMLButtonElement)
   const next = event.key === 'ArrowDown' ? (index + 1) % items.length : event.key === 'ArrowUp' ? (index - 1 + items.length) % items.length : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null
   if (next !== null) { event.preventDefault(); items[next]?.focus() }
   if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
   if (event.key === 'Tab') { trigger.current?.focus(); setOpen(false) }
   if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const now = Date.now(); search.current.text = (now - search.current.time < 700 ? search.current.text : '') + event.key.toLocaleLowerCase(); search.current.time = now
    items.find(item => item.textContent?.toLocaleLowerCase().startsWith(search.current.text))?.focus()
   }
  }}>{options.map((option, index) => <button key={`${option.value}-${index}`} type="button" role="option" tabIndex={-1} data-value={option.value} aria-selected={selected === option.value} disabled={option.disabled} onClick={() => {
   const select = native.current!
   select.value = option.value
   select.dispatchEvent(new Event('change', { bubbles: true }))
   setSelected(select.value); close()
  }}><span>{option.label}</span>{selected === option.value && <Check size={16} aria-hidden="true"/>}</button>)}</div>, native.current?.closest('dialog') || document.body)}
 </span>
}

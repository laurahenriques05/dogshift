import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import './modal.css'

export function Modal({title,description,children,onClose,busy=false}:{title:string;description?:string;children:ReactNode;onClose:()=>void;busy?:boolean}) {
 const ref=useRef<HTMLDialogElement>(null),id=useId()
 useEffect(()=>{
  const previous=document.activeElement
  const dialog=ref.current
  if(dialog&&!dialog.open){dialog.showModal();dialog.querySelector<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea')?.focus()}
  return()=>{dialog?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus()}
 },[])
 return <dialog ref={ref} className="care-modal" aria-labelledby={`${id}-title`} aria-describedby={description?`${id}-description`:undefined} onCancel={event=>{event.preventDefault();if(!busy)onClose()}}>
  <header className="care-modal-heading"><div><h2 id={`${id}-title`}>{title}</h2>{description&&<p id={`${id}-description`}>{description}</p>}</div><button type="button" className="care-modal-close" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={20}/></button></header>
  {children}
 </dialog>
}

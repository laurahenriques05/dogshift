import { useEffect, useId, useRef } from 'react'
import { Footprints, X } from 'lucide-react'
import { Button, Notice } from '../../components/ui'

export function WalkNfcConfirmation({dogName,title,time,loading,busy,blocked,onClose,onConfirm}:{dogName:string;title:string;time:string|null;loading:boolean;busy:boolean;blocked:string;onClose:()=>void;onConfirm:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null),id=useId()
 useEffect(()=>{
  const previous=document.activeElement,element=dialog.current
  if(element&&!element.open)element.showModal()
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden'
  return()=>{element?.close();document.body.style.overflow=overflow;if(previous instanceof HTMLElement&&previous.isConnected)previous.focus()}
 },[])
 return <dialog ref={dialog} className="feeding-modal walk-nfc-confirmation" aria-labelledby={`${id}-title`} onCancel={event=>{event.preventDefault();if(!busy)onClose()}} onClick={event=>{if(event.target===event.currentTarget&&!busy)onClose()}}>
  <div className="feeding-modal-panel">
   <header><div><p className="eyebrow">QUICK ACTION</p><h2 id={`${id}-title`}>Confirm walk</h2></div><button type="button" className="feeding-modal-close" aria-label="Cancel walk confirmation" disabled={busy} onClick={onClose}><X aria-hidden="true"/></button></header>
   <div className="feeding-modal-body"><div className="feeding-nfc-quick-confirm">
    <div className="feeding-nfc-quick-heading"><p className="eyebrow">{loading?'LOADING YOUR ROUTINE':'READY TO CONFIRM'}</p><h2>{title}</h2>{time&&<p className="walk-nfc-estimate">Estimated time · <time>{time}</time></p>}</div>
    <div className="walk-nfc-dog"><Footprints size={24} aria-hidden="true"/><span>A little adventure with <strong>{dogName}</strong>.</span></div>
    {blocked&&<Notice>{blocked}</Notice>}
    <Button className="feeding-nfc-confirm-button" disabled={busy||!!blocked} onClick={onConfirm}>Confirm start</Button>
    {blocked?<Button className="secondary" disabled={busy} onClick={onClose}>Back to Walks</Button>:<p className="feeding-nfc-quick-note">Choose GPS and recording options next. Nothing starts until you confirm them.</p>}
   </div></div>
  </div>
 </dialog>
}

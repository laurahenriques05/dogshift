import { useEffect, useRef } from 'react'
import { Button } from '../../components/ui'

export function StationaryWalkDialog({dogName,busy,onYes,onNo}:{dogName:string;busy:boolean;onYes:()=>void;onNo:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null
  const element=dialog.current!
  element.showModal()
  element.querySelector<HTMLButtonElement>('button')?.focus()
  return()=>{element.close();previous?.focus()}
 },[])
 return <dialog ref={dialog} className="walk-restore-dialog" aria-labelledby="walk-stationary-title" onCancel={event=>{event.preventDefault();if(!busy)onYes()}}>
  <h2 id="walk-stationary-title">Still on your adventure with {dogName}?</h2>
  <p>No movement detected for 2 minutes. This walk will end in 5 minutes unless you answer.</p>
  <div className="walk-restore-actions"><Button disabled={busy} onClick={onYes}>Yes</Button><Button className="secondary" disabled={busy} onClick={onNo}>No</Button></div>
 </dialog>
}

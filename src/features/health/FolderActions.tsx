import { useRef, useState, useEffect } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button, Field, Notice, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
export function FolderActions({home,id,name,deleted=false,onChanged}:{home:string;id:string|null;name:string;deleted?:boolean;onChanged:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null)
 const [menu,setMenu]=useState(false),[action,setAction]=useState<'rename'|'delete'|'restore'|'purge'|null>(null),[value,setValue]=useState(name),[busy,setBusy]=useState(false),[error,setError]=useState('')
 useEffect(()=>{if(action&&!dialog.current?.open)dialog.current?.showModal()},[action])
 async function submit(){setBusy(true);setError('');try{if(!action)return
  if(action==='delete'||action==='purge'){
   const prepared=await db().rpc('prepare_health_folder_deletion',{p_household:home,p_folder:id});if(prepared.error)throw prepared.error
   const plan=prepared.data?.[0];if(!plan)throw new Error('Folder deletion could not be prepared.')
   for(let offset=0;offset<plan.document_paths.length;offset+=100){
    const removed=await db().storage.from('health-documents').remove(plan.document_paths.slice(offset,offset+100));if(removed.error)throw removed.error
   }
   const finished=await db().rpc('permanently_delete_health_folder',{p_household:home,p_folder:plan.folder_id});if(finished.error)throw finished.error
  }else{
   const result=await db().rpc('manage_health_document_folder',{p_household:home,p_folder:id,p_action:action,p_name:action==='rename'?value.trim():null});if(result.error)throw result.error
  }
  setAction(null);setMenu(false);onChanged()
 }catch(e){setError((action==='delete'||action==='purge')?'Deletion did not finish. Some documents may already have been removed. Retry to finish deleting this folder. '+errorMessage(e):errorMessage(e))}finally{setBusy(false)}}
 return <div className="folder-action-control"><Button type="button" className="secondary health-folder-more" aria-label={`Options for folder ${name}`} aria-expanded={menu} onClick={()=>setMenu(!menu)}><MoreHorizontal size={18} aria-hidden="true"/></Button>
 {menu&&<div className="folder-action-menu"><Button type="button" className="secondary" onClick={()=>{setValue(name);setError('');setMenu(false);setAction('rename')}}>Rename</Button><Button type="button" className="secondary" onClick={()=>{setError('');setMenu(false);setAction(deleted?'restore':'delete')}}>{deleted?'Restore':'Delete'}</Button>{deleted&&<Button type="button" className="secondary" onClick={()=>{setError('');setMenu(false);setAction('purge')}}>Delete permanently</Button>}<Button type="button" className="secondary" onClick={()=>setMenu(false)}>Close menu</Button></div>}
 {action&&<dialog ref={dialog} className="health-folder-dialog" aria-labelledby={`folder-${id||'default'}-title`} onCancel={event=>{event.stopPropagation();if(busy)event.preventDefault();else setAction(null)}}><h2 id={`folder-${id||'default'}-title`}>{action==='rename'?'Rename folder':action==='delete'?'Permanently delete folder?':action==='purge'?'Permanently delete folder?':'Restore folder?'}</h2><p>{name}</p>{action==='rename'?<Field label="Folder name" maxLength={80} autoFocus value={value} onChange={event=>setValue(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();if(!busy)void submit()}}}/>:<p>{action==='delete'?'This permanently deletes the folder and every document inside it for the whole family. This cannot be undone.':action==='purge'?'This permanently deletes the folder and every document inside it for the whole family. This cannot be undone.':'The folder and its documents will return to the main list.'}</p>}{error&&<Notice error>{error}</Notice>}<div className="walk-actions"><Button type="button" disabled={busy} onClick={()=>void submit()}>{busy?(action==='delete'||action==='purge'?'Deleting…':'Saving…'):action==='rename'?'Save name':action==='delete'?'Delete folder':action==='purge'?'Delete permanently':'Restore folder'}</Button><Button type="button" className="secondary" disabled={busy} onClick={()=>setAction(null)}>Cancel</Button></div></dialog>}
 </div>
}

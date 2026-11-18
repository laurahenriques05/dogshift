import { FolderActions } from './FolderActions'
import { useEffect, useState } from 'react'
import { Folder, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Field, Notice, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
import { useAuth } from '../auth/AuthProvider'
import type { HealthDocumentFolder } from '../../lib/supabase/database.types'
import { documentLabel, documentObjectName } from './documentFolders'
import { validateHealthFile } from './DocumentsPage'

type DocumentOption = {path:string;name:string;folderId:string|null}
export function VisitDocuments({home,paths,onChange,busy,onBusy}:{home:string;paths:string[];onChange:(paths:string[])=>void;busy:boolean;onBusy:(busy:boolean)=>void}) {
 const {session}=useAuth()
 const [folders,setFolders]=useState<HealthDocumentFolder[]>([]),[files,setFiles]=useState<DocumentOption[]>([])
 const [selected,setSelected]=useState<string|null>(null),[creating,setCreating]=useState(false),[name,setName]=useState('')
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[retry,setRetry]=useState(0)
 useEffect(()=>{let active=true;setLoading(true);setError('');void(async()=>{try{
  const result=await db().from('health_document_folders').select('*').eq('household_id',home).order('name');if(result.error)throw result.error
  const list=async(prefix:string)=>{const items=[];for(let offset=0;;offset+=100){const page=await db().storage.from('health-documents').list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});if(page.error)throw page.error;items.push(...page.data);if(page.data.length<100)break}return items}
  const documents:DocumentOption[]=[]
  for(const uploader of await list(home)){if(uploader.id)continue;for(const file of await list(`${home}/${uploader.name}`)){if(file.id)documents.push({path:`${home}/${uploader.name}/${file.name}`,...documentLabel(file.name)})}}
  if(active){setFolders(result.data);setFiles(documents)}
 }catch(e){if(active)setError(errorMessage(e))}finally{if(active)setLoading(false)}})();return()=>{active=false}},[home,retry])
 const defaultFolder=folders.find(folder=>folder.is_default)
 const allOptions=[{id:'general',name:defaultFolder?.name||'General',deleted_at:defaultFolder?.deleted_at},...folders.filter(folder=>!folder.is_default)]
 const options=allOptions.filter(folder=>!folder.deleted_at)
 const activeFolder=allOptions.find(folder=>folder.id===selected)
 const folderTitle=allOptions.find(folder=>folder.id===selected)?.name||'General'
 const belongs=(file:DocumentOption,id:string)=>id==='general'?(!file.folderId||!folders.some(folder=>folder.id===file.folderId)):file.folderId===id
 async function createFolder(){onBusy(true);setError('');setMessage('');try{
  const trimmed=name.trim();if(!trimmed||trimmed.length>80)throw new Error('Enter a folder name of 1–80 characters.')
  if(allOptions.some(folder=>folder.name.toLowerCase()===trimmed.toLowerCase()))throw new Error('A folder with this name already exists.')
  const result=await db().from('health_document_folders').insert({household_id:home,name:trimmed}).select().single();if(result.error)throw result.error
  setFolders(current=>[...current,result.data].sort((a,b)=>a.name.localeCompare(b.name)));setSelected(result.data.id);setCreating(false);setName('');setMessage('Folder created.')
 }catch(e){setError(errorMessage(e))}finally{onBusy(false)}}
 async function upload(file:File){onBusy(true);setError('');setMessage('');try{
  if(activeFolder?.deleted_at)throw new Error('Restore this folder before adding files.');
  if(!session||!selected)throw new Error('Select a folder and sign in to upload a document.')
  if(paths.length>=20)throw new Error('A visit can have up to 20 linked documents.')
  const folderId=selected==='general'?null:folders.find(folder=>folder.id===selected)?.id
  if(selected!=='general'&&!folderId)throw new Error('This folder is unavailable. Choose another folder.')
  await validateHealthFile(file)
  const objectName=documentObjectName(crypto.randomUUID(),folderId||null,file.name),path=`${home}/${session.user.id}/${objectName}`
  const result=await db().storage.from('health-documents').upload(path,file,{contentType:file.type,upsert:false});if(result.error)throw result.error
  setFiles(current=>[...current,{path,...documentLabel(objectName)}]);onChange([...paths,path]);setMessage('Document uploaded. Save summary to keep it linked to this visit.')
 }catch(e){setError(errorMessage(e))}finally{onBusy(false)}}
 async function download(file:DocumentOption){onBusy(true);setError('');try{const result=await db().storage.from('health-documents').download(file.path);if(result.error)throw result.error;const url=URL.createObjectURL(result.data),anchor=document.createElement('a');anchor.href=url;anchor.download=file.name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}catch(e){setError(errorMessage(e))}finally{onBusy(false)}}
 function toggle(path:string){setError('');if(paths.includes(path))onChange(paths.filter(item=>item!==path));else if(paths.length<20)onChange([...paths,path]);else setError('A visit can have up to 20 linked documents.')}
 return <section className="visit-documents" aria-label="Related documents"><header className="health-upcoming-header"><h3>Related documents</h3><Button type="button" className="secondary" disabled={busy||loading} onClick={()=>{setCreating(true);setName('');setError('')}}>+ New folder</Button></header>
 <p className="muted">Use the shared archive folders, or create one such as Invoices, Prescriptions or Test results. Upload once; link it to this visit when you save the summary.</p>
 {creating&&<div className="visit-folder-create"><Field label="New folder name" maxLength={80} value={name} onChange={event=>setName(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();if(!busy)void createFolder()}}}/><div className="walk-actions"><Button type="button" disabled={busy} onClick={()=>void createFolder()}>Create folder</Button><Button type="button" className="secondary" disabled={busy} onClick={()=>setCreating(false)}>Cancel</Button></div></div>}
 {loading?<p role="status">Loading folders…</p>:selected?<><Button type="button" className="secondary" disabled={busy} onClick={()=>setSelected(null)}><ArrowLeft size={14} aria-hidden="true"/> All folders</Button><h4>{folderTitle}</h4><label className="field">Add document<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy||!!activeFolder?.deleted_at} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void upload(file)}}/><small>PDF, JPG, PNG or WebP · up to 10 MB</small></label>{files.filter(file=>belongs(file,selected)).length===0?<p>No documents in this folder yet.</p>:files.filter(file=>belongs(file,selected)).map(file=><div className="visit-document-row" key={file.path}><label><input type="checkbox" checked={paths.includes(file.path)} disabled={busy} onChange={()=>toggle(file.path)}/><span>{file.name}</span></label><Button type="button" className="secondary" disabled={busy} onClick={()=>void download(file)}>Download</Button></div>)}</>:<ul className="visit-folder-list">{options.map(folder=><li key={folder.id}><button type="button" disabled={busy} onClick={()=>{setSelected(folder.id);setError('');setMessage('')}}><Folder size={21} aria-hidden="true"/><span>{folder.name}<small>{files.filter(file=>belongs(file,folder.id)).length} documents · {files.filter(file=>belongs(file,folder.id)&&paths.includes(file.path)).length} linked</small></span><span aria-hidden="true">›</span></button><FolderActions home={home} id={folder.id==='general'?(defaultFolder?.id||null):folder.id} name={folder.name} onChanged={()=>{setSelected(null);setRetry(value=>value+1)}}/></li>)}</ul>}
 {!loading&&folders.some(folder=>folder.deleted_at)&&<details><summary>Deleted folders</summary><ul className="visit-folder-list">{folders.filter(folder=>folder.deleted_at).map(folder=><li key={folder.id}><button type="button" disabled={busy} onClick={()=>setSelected(folder.is_default?'general':folder.id)}><Folder size={21} aria-hidden="true"/>{folder.name}</button><FolderActions home={home} id={folder.id} name={folder.name} deleted onChanged={()=>{setSelected(null);setRetry(value=>value+1)}}/></li>)}</ul></details>}
 <p>{paths.length} documents selected for this visit</p>
 {!loading&&paths.filter(path=>!files.some(file=>file.path===path)).map(path=><label className="visit-document-missing" key={path}><input type="checkbox" checked disabled={busy} onChange={()=>toggle(path)}/> Unavailable document — uncheck to remove link</label>)}
 {message&&<Notice>{message}</Notice>}{error&&<><Notice error>{error}</Notice><Button type="button" className="secondary" disabled={busy} onClick={()=>setRetry(value=>value+1)}>Reload documents</Button></>}<Link to="/health/documents">Open full document archive →</Link>
 </section>
}

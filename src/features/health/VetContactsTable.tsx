import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { Button, Notice } from '../../components/ui'
import type { VetContact } from '../../lib/supabase/database.types'
import { localTime } from './time'

type Props={rows:VetContact[];zone:string;loading:boolean;error:string;busy:boolean;onRetry:()=>void;onAdd:()=>void;onEdit:(contact:VetContact)=>void}
export function VetContactsTable({rows,zone,loading,error,busy,onRetry,onAdd,onEdit}:Props){
 const [query,setQuery]=useState(''),[sort,setSort]=useState('newest')
 const matches=rows.filter(row=>[row.name,row.phone,row.email,row.address,row.notes].some(value=>(value||'').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):Date.parse(b.created_at)-Date.parse(a.created_at))
 return <section className="vet-contact-directory" aria-label="Veterinarian contacts">
  <header className="vet-contact-toolbar"><h2>Contacts</h2><div className="vet-contact-tools">
   <label className="vet-contact-search"><Search size={17} aria-hidden="true"/><span className="sr-only">Search contacts</span><input type="search" placeholder="Search contacts…" value={query} onChange={event=>setQuery(event.target.value)}/></label>
   <label><span className="sr-only">Sort contacts</span><select value={sort} onChange={event=>setSort(event.target.value)}><option value="newest">Newest first</option><option value="name">Name A–Z</option></select></label>
   <Button disabled={busy} onClick={onAdd}><Plus size={16} aria-hidden="true"/>Add contact</Button>
  </div></header>
  <div className="card vet-contact-panel">{loading?<p role="status">Loading contacts…</p>:error?<><Notice error>{error}</Notice><Button onClick={onRetry}>Try again</Button></>:!rows.length?<p>No contacts yet. Add your first veterinarian or clinic.</p>:!matches.length?<p>No contacts match your search.</p>:<div className="vet-contact-scroll" role="region" aria-label="Contact list" tabIndex={0}><table className="vet-contact-table"><caption className="sr-only">Veterinarian contacts for your family</caption><thead><tr><th scope="col">Name / clinic</th><th scope="col">Phone</th><th scope="col">Email</th><th scope="col">Address</th><th scope="col">Added</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{matches.map(row=><tr key={row.id}>
   <th scope="row"><div className="vet-contact-name"><span className="vet-contact-avatar" aria-hidden="true">{row.name.trim().slice(0,1).toUpperCase()}</span><div><strong>{row.name}</strong>{row.notes&&<p>{row.notes}</p>}</div></div></th>
   <td>{row.phone||'—'}</td><td>{row.email?<a href={`mailto:${row.email}`}>{row.email}</a>:'—'}</td><td>{row.address||'—'}</td><td><time dateTime={row.created_at}>{localTime(row.created_at,zone).slice(0,10)}</time></td><td><Button className="secondary" disabled={busy} aria-label={`Edit contact ${row.name}`} onClick={()=>onEdit(row)}>Edit</Button></td>
  </tr>)}</tbody></table></div>}</div>
 </section>
}

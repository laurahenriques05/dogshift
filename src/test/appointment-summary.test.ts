import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { filterAppointmentHistory } from '../features/health/appointmentHistory'
import type { VetAppointment } from '../lib/supabase/database.types'
it('searches without accents, filters household-local inclusive dates and types, excludes future visits and sorts newest first',()=>{
 const row=(id:string,starts_at:string,title:string,appointment_type='consultation')=>({id,starts_at,title,appointment_type,location:'Clínica Lisboa',notes:'Annual check'} as VetAppointment)
 const rows=[row('a','2026-07-01T23:30Z','Older'),row('b','2026-07-02T09:00Z','Vaccine','vaccination'),row('c','2026-07-04T10:00Z','Future')]
 const base={query:'',type:'',from:'',to:''}
 expect(filterAppointmentHistory(rows,'Europe/Lisbon',Date.parse('2026-07-03'),base).map(r=>r.id)).toEqual(['b','a'])
 expect(filterAppointmentHistory(rows,'Europe/Lisbon',Date.parse('2026-07-03'),{...base,query:'clinica',from:'2026-07-02',to:'2026-07-02'})).toHaveLength(2)
 expect(filterAppointmentHistory(rows,'Europe/Lisbon',Date.parse('2026-07-03'),{...base,type:'vaccination'}).map(r=>r.id)).toEqual(['b'])
 expect(filterAppointmentHistory(rows,'UTC',Date.parse('2026-07-03'),{...base,query:'missing'})).toEqual([])
})
it('persists shared summaries, validates links, blocks outsiders/former members, protects audit and cascades appointment deletion',async()=>{
 const sql=new PGlite()
 const owner='10000000-0000-0000-0000-000000000001',member='10000000-0000-0000-0000-000000000002',outsider='10000000-0000-0000-0000-000000000003'
 const home='20000000-0000-0000-0000-000000000001',other='20000000-0000-0000-0000-000000000002'
 const med='30000000-0000-0000-0000-000000000001',foreignMed='30000000-0000-0000-0000-000000000002'
 const asUser=(id:string)=>sql.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`)
 try{
 await sql.exec(`create role anon;create role authenticated;create schema auth;create schema private;create schema storage;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,private to authenticated;grant execute on function auth.uid() to authenticated;
 create table public.households(id uuid primary key);create table public.members(home uuid,user_id uuid);
 create function private.is_member(h uuid) returns boolean language sql stable security definer as $$select exists(select 1 from public.members where home=h and user_id=auth.uid())$$;
 create table public.medication_schedules(id uuid primary key,household_id uuid);create table storage.objects(bucket_id text,name text);
 insert into auth.users values('${owner}'),('${member}'),('${outsider}');insert into households values('${home}'),('${other}');insert into members values('${home}','${owner}'),('${home}','${member}'),('${other}','${outsider}');
 insert into medication_schedules values('${med}','${home}'),('${foreignMed}','${other}');insert into storage.objects values('health-documents','${home}/u/file.pdf'),('health-documents','${other}/u/file.pdf');`)
 for(const file of ['202611110002_vet_appointments.sql','20261118120000_appointment_summaries.sql']) await sql.exec(readFileSync('supabase/migrations/'+file,'utf8'))
 await asUser(owner)
 const visit=(await sql.query<{id:string}>(`insert into vet_appointments(household_id,title,starts_at,appointment_type) values($1,'Checkup',now(),'consultation') returning id`,[home])).rows[0].id
 await sql.query(`insert into appointment_summaries(appointment_id,reason,observations,treatment,next_visit_at,medication_ids,document_paths) values($1,'Check','Vet notes','As prescribed','2026-12-01T10:00Z',$2,$3)`,[visit,[med],[home+'/u/file.pdf']])
 await asUser(member)
 expect((await sql.query('select reason from appointment_summaries')).rows).toEqual([{reason:'Check'}])
 const update=await sql.query<{updated_by:string}>(`update appointment_summaries set observations='Updated' where appointment_id=$1 returning updated_by`,[visit]);expect(update.rows[0].updated_by).toBe(member)
 await expect(sql.query(`update appointment_summaries set medication_ids=$1 where appointment_id=$2`,[[foreignMed],visit])).rejects.toThrow()
 await expect(sql.query(`update appointment_summaries set document_paths=$1 where appointment_id=$2`,[[other+'/u/file.pdf'],visit])).rejects.toThrow()
 await expect(sql.query(`update appointment_summaries set reason=repeat('x',2001) where appointment_id=$1`,[visit])).rejects.toThrow()
 await expect(sql.query(`update appointment_summaries set updated_by=$1 where appointment_id=$2`,[owner,visit])).rejects.toThrow()
 await asUser(outsider)
 expect((await sql.query('select * from appointment_summaries')).rows).toHaveLength(0)
 expect((await sql.query(`update appointment_summaries set reason='Intrusion' returning *`)).rows).toHaveLength(0)
 await sql.exec(`reset role;delete from members where user_id='${member}'`);await asUser(member)
 expect((await sql.query('select * from appointment_summaries')).rows).toHaveLength(0)
 await expect(sql.query(`insert into appointment_summaries(appointment_id) values($1)`,[visit])).rejects.toThrow()
 await sql.exec(`reset role;set role anon`);await expect(sql.query('select * from appointment_summaries')).rejects.toThrow()
 await sql.exec(`reset role;delete from auth.users where id='${member}'`)
 expect((await sql.query<{updated_by:string|null}>('select updated_by from appointment_summaries')).rows[0].updated_by).toBe(null)
 await sql.exec(`delete from vet_appointments where id='${visit}'`)
 expect((await sql.query('select * from appointment_summaries')).rows).toHaveLength(0)
 }finally{await sql.close()}
},30000)

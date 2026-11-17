import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { expect,it } from 'vitest'
import { documentLabel, documentObjectName } from '../features/health/documentFolders'
it('preserves legacy names and round-trips folder assignments without changing uploader path',()=>{
 const id='10000000-0000-0000-0000-000000000001',folder='20000000-0000-0000-0000-000000000001'
 expect(documentLabel(`${id}--prescription.pdf`)).toEqual({name:'prescription.pdf',folderId:null})
 const filename=documentObjectName(id,folder,'blood/results.pdf')
 expect(filename).not.toContain('/')
 expect(documentLabel(filename)).toEqual({name:'blood_results.pdf',folderId:folder})
})
it('isolates folder metadata and private files by current household, with authenticated creation only',async()=>{
 const sql=new PGlite(),a='10000000-0000-0000-0000-000000000001',b='10000000-0000-0000-0000-000000000002',c='10000000-0000-0000-0000-000000000003'
 const asUser=async(id:string)=>sql.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`)
 try{
 await sql.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated,anon;grant select,insert,update,delete on storage.objects to authenticated;grant select on storage.objects to anon;`)
 for(const file of ['202611070001_initial_schema.sql','20261111220001_health_documents.sql','20261116220000_health_document_folders.sql','20261116221000_health_folder_renaming.sql','20261117130000_health_default_folder_name.sql'])await sql.exec(readFileSync('supabase/migrations/'+file,'utf8'))
 await sql.exec(`insert into auth.users(id) values('${a}'),('${b}'),('${c}')`);await asUser(a)
 const home=(await sql.query<{id:string}>("select public.create_household('Home','Europe/Lisbon') id")).rows[0].id
 await sql.exec(`reset role;insert into public.household_members(household_id,user_id,role) values('${home}','${b}','member')`)
 await asUser(b)
 const folder=(await sql.query<{id:string}>("insert into public.health_document_folders(household_id,name) values($1,'Prescriptions') returning id",[home])).rows[0].id
 await expect(sql.query("insert into public.health_document_folders(household_id,name,is_default) values($1,'Default by member',true)",[home])).rejects.toThrow()
 const path=`${home}/${b}/${documentObjectName(crypto.randomUUID(),folder,'prescription.pdf')}`
 await sql.query("insert into storage.objects(bucket_id,name) values('health-documents',$1)",[path])
 await expect(sql.query("insert into public.health_document_folders(household_id,name,created_by) values($1,'Forged',$2)",[home,a])).rejects.toThrow()
 await expect(sql.query("insert into public.health_document_folders(household_id,name) values($1,'prescriptions')",[home])).rejects.toThrow()
 await expect(sql.query("insert into public.health_document_folders(household_id,name) values($1,'')",[home])).rejects.toThrow()
 await asUser(a);expect((await sql.query('select * from public.health_document_folders')).rows).toHaveLength(1);expect((await sql.query('select * from storage.objects')).rows).toHaveLength(1)
 await sql.query("update public.health_document_folders set name='Owner renamed' where id=$1",[folder])
 expect((await sql.query<{name:string}>('select name from public.health_document_folders')).rows[0].name).toBe('Owner renamed')
 await expect(sql.query('update public.health_document_folders set household_id=$1',[home])).rejects.toThrow()
 await expect(sql.query('update public.health_document_folders set created_by=$1',[a])).rejects.toThrow()
 await asUser(b);await sql.query("update public.health_document_folders set name='Creator renamed' where id=$1",[folder])
 expect((await sql.query<{name:string}>('select name from public.health_document_folders')).rows[0].name).toBe('Creator renamed')
 expect((await sql.query<{name:string}>('select name from storage.objects')).rows[0].name).toBe(path)
 await expect(sql.query("update public.health_document_folders set name='' where id=$1",[folder])).rejects.toThrow()
 await sql.query("insert into public.health_document_folders(household_id,name) values($1,'Other folder')",[home])
 await expect(sql.query("update public.health_document_folders set name='other FOLDER' where id=$1",[folder])).rejects.toThrow()
 await sql.exec(`reset role;insert into public.household_members(household_id,user_id,role) values('${home}','${c}','member')`);await asUser(c)
 expect((await sql.query("update public.health_document_folders set name='Not mine' where id=$1 returning id",[folder])).rows).toHaveLength(0)
 await sql.exec(`reset role;delete from public.household_members where user_id='${c}'`);await asUser(a)
 await expect(sql.query('delete from public.health_document_folders')).rejects.toThrow()
 await asUser(c);expect((await sql.query('select * from public.health_document_folders')).rows).toHaveLength(0);expect((await sql.query('select * from storage.objects')).rows).toHaveLength(0)
 await expect(sql.query("insert into public.health_document_folders(household_id,name) values($1,'Outside')",[home])).rejects.toThrow()
 expect((await sql.query("update public.health_document_folders set name='Outside' where id=$1 returning id",[folder])).rows).toHaveLength(0)
 await sql.exec(`reset role;delete from public.household_members where user_id='${b}'`);await asUser(b)
 expect((await sql.query('select * from public.health_document_folders')).rows).toHaveLength(0);expect((await sql.query('select * from storage.objects')).rows).toHaveLength(0)
 await expect(sql.query("insert into public.health_document_folders(household_id,name) values($1,'Former')",[home])).rejects.toThrow()
 expect((await sql.query("update public.health_document_folders set name='Former' where id=$1 returning id",[folder])).rows).toHaveLength(0)
 await sql.exec('reset role;set role anon');await expect(sql.query('select * from public.health_document_folders')).rejects.toThrow()
 await sql.exec(`reset role;delete from auth.users where id='${b}'`)
 expect((await sql.query<{created_by:string|null}>('select created_by from public.health_document_folders')).rows[0].created_by).toBeNull()
 await asUser(a)
 const defaultId=(await sql.query<{id:string}>("insert into public.health_document_folders(household_id,name,is_default) values($1,'General renamed',true) returning id",[home])).rows[0].id
 await sql.query("update public.health_document_folders set name='Old records' where id=$1",[defaultId])
 expect((await sql.query<{name:string}>('select name from public.health_document_folders where is_default')).rows[0].name).toBe('Old records')
 expect((await sql.query<{name:string}>('select name from storage.objects')).rows[0].name).toBe(path)
 await expect(sql.query("insert into public.health_document_folders(household_id,name,is_default) values($1,'Another default',true)",[home])).rejects.toThrow()
 await expect(sql.query('update public.health_document_folders set is_default=false where id=$1',[defaultId])).rejects.toThrow()
 await sql.exec('reset role')
 await sql.query('delete from public.households where id=$1',[home]);expect((await sql.query('select * from public.health_document_folders')).rows).toHaveLength(0)
 }finally{await sql.close()}
},30000)

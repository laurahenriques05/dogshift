import { PGlite } from '@electric-sql/pglite'
import { readFileSync,readdirSync } from 'node:fs'
import { expect,it } from 'vitest'

it('preserves a sole-owner family on leaving and restricts restoration to that owner',async()=>{
 const sql=new PGlite()
 const a='10000000-0000-0000-0000-000000000001',b='10000000-0000-0000-0000-000000000002'
 const user=async(id:string)=>sql.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`)
 try{
 await sql.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated,anon;grant select,insert,update,delete on storage.objects to authenticated;`)
 // Scheduler-only setup requires pg_cron, unavailable in PGlite; retention SQL still runs.
 for(const f of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')&&f!=='20261123142121_enable_walk_retention_schedule.sql').sort())await sql.exec(readFileSync('supabase/migrations/'+f,'utf8'))
 await sql.exec(`insert into auth.users(id,email,email_confirmed_at) values('${a}','owner@example.test',now()),('${b}','other@example.test',now())`)
 await user(a)
 const home=(await sql.query<{id:string}>("select public.create_household('Saved family','UTC') id")).rows[0].id
 await sql.query("insert into public.dogs(household_id,name) values($1,'Keep dog')",[home])
 await sql.query("insert into public.treatments(household_id,title,occurred_on) values($1,'Keep care','2020-01-01')",[home])
 const photo=`${home}/${a}/10000000-0000-0000-0000-000000000003--record.pdf`
 await sql.query("insert into storage.objects(bucket_id,name) values('health-documents',$1)",[photo])
 const invitation=(await sql.query<{token:string}>("select public.create_household_invitation($1,'other@example.test')->>'token' as token",[home])).rows[0].token
 await expect(sql.query('select public.leave_sole_household($1)',[crypto.randomUUID()])).rejects.toThrow()
 await sql.query('select public.leave_sole_household($1)',[home])
 expect((await sql.query('select * from public.households')).rows).toHaveLength(0)
 expect((await sql.query('select * from public.dogs')).rows).toHaveLength(0)
 expect((await sql.query('select * from storage.objects')).rows).toHaveLength(0)
 expect((await sql.query('select * from public.get_inactive_households()')).rows).toMatchObject([{id:home,name:'Saved family'}])
 await expect(sql.query('select * from private.inactive_households')).rejects.toThrow()
 await sql.exec('reset role')
 expect((await sql.query('select * from public.dogs where household_id=$1',[home])).rows).toHaveLength(1)
 expect((await sql.query('select * from public.treatments where household_id=$1',[home])).rows).toHaveLength(1)
 expect((await sql.query('select * from storage.objects where name=$1',[photo])).rows).toHaveLength(1)
 expect((await sql.query('select revoked_at from public.invitations where household_id=$1',[home])).rows[0]).not.toEqual({revoked_at:null})
 // A checked invitation or privileged concurrent insert cannot repopulate an inactive family.
 await expect(sql.query("insert into public.household_members(household_id,user_id,role) values($1,$2,'member')",[home,b])).rejects.toThrow('inactive')
 await user(b)
 expect((await sql.query('select * from public.get_inactive_households()')).rows).toHaveLength(0)
 await expect(sql.query('select public.restore_inactive_household($1)',[home])).rejects.toThrow()
 await expect(sql.query('select public.leave_sole_household($1)',[home])).rejects.toThrow()
 await expect(sql.query('select public.accept_household_invitation($1)',[invitation])).rejects.toThrow('unavailable or has expired')
 await user(a)
 const newHome=(await sql.query<{id:string}>("select public.create_household('New family','UTC') id")).rows[0].id
 expect(newHome).not.toBe(home)
 await sql.query('select public.restore_inactive_household($1)',[home])
 expect((await sql.query('select * from public.get_inactive_households()')).rows).toHaveLength(0)
 expect((await sql.query<{role:string}>('select role from public.household_members where household_id=$1 and user_id=$2',[home,a])).rows[0].role).toBe('owner')
 expect((await sql.query('select * from storage.objects where name=$1',[photo])).rows).toHaveLength(1)
 await expect(sql.query('select public.restore_inactive_household($1)',[home])).rejects.toThrow()
 await sql.exec('reset role')
 await sql.query("insert into public.household_members(household_id,user_id,role) values($1,$2,'member')",[home,b])
 await user(a)
 await expect(sql.query('select public.leave_sole_household($1)',[home])).rejects.toThrow('membership changed')
 await sql.query('select public.leave_household($1,$2)',[home,b])
 await user(b)
 expect((await sql.query<{role:string}>('select role from public.household_members where household_id=$1 and user_id=$2',[home,b])).rows[0].role).toBe('owner')
 await sql.exec('reset role;set role anon')
 await expect(sql.query('select * from public.get_inactive_households()')).rejects.toThrow()
 await expect(sql.query('select public.restore_inactive_household($1)',[home])).rejects.toThrow()
 await expect(sql.query('select public.leave_sole_household($1)',[home])).rejects.toThrow()
 }finally{await sql.close()}
},30000)

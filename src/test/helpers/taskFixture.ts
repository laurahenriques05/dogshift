import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'

export const owner = '10000000-0000-0000-0000-000000000001'
export const member = '10000000-0000-0000-0000-000000000002'
export const outsider = '10000000-0000-0000-0000-000000000003'
export async function taskFixture(includeFix = true, includeReliability = true) {
 const sql = new PGlite()
 const user = async (id: string) => sql.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`)
 await sql.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text);
 alter table storage.objects enable row level security;grant usage on schema storage to authenticated,anon;
 grant select,insert,update,delete on storage.objects to authenticated;`)
 for (const file of readdirSync('supabase/migrations').filter(file => file.endsWith('.sql')).sort()) {
  if (!includeFix && file === '20261115140000_task_review_fixes.sql') continue
  if (!includeReliability && (file === '20261117140000_tasks_reliability.sql' || file === '20261120140000_occurrence_care_tasks.sql' || file === '20261122215728_walk_seven_day_retention.sql')) continue
  await sql.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'))
 }
 await sql.exec(`insert into auth.users(id,email,email_confirmed_at) values('${owner}','a@example.test',now()),('${member}','b@example.test',now()),('${outsider}','c@example.test',now())`)
 await user(owner)
 const home = (await sql.query<{ id: string }>("select public.create_household('Tasks','UTC') id")).rows[0].id
 await sql.exec(`reset role;insert into public.household_members(household_id,user_id,role) values('${home}','${member}','member')`)
 await user(owner)
 const task = async (assigned: string | null, due = "clock_timestamp()+interval '30 minutes'") => {
  const series = (await sql.query<{ id: string }>(`select public.save_household_task($1,null,'Task','',$2,${due},'none',1,null) id`, [home, assigned])).rows[0].id
  const occurrence = (await sql.query<{ id: string }>('select id from public.task_occurrences where series_id=$1', [series])).rows[0].id
  return { series, occurrence }
 }
 return { sql, user, home, task }
}


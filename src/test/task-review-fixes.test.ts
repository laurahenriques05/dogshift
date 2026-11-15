import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { expect, it } from 'vitest'

const owner = '10000000-0000-0000-0000-000000000001'
const member = '10000000-0000-0000-0000-000000000002'
const outsider = '10000000-0000-0000-0000-000000000003'
async function fixture(includeFix = true) {
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
  if (includeFix || file !== '20261115140000_task_review_fixes.sql') await sql.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'))
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

it('stopping a task removes future open calendar dates, cancels reminders and preserves completed/overdue history', async () => {
 const { sql, user, home, task } = await fixture()
 try {
  const future = await task(member)
  // Additional rows emulate dates of this same recurring series.
  await sql.exec('reset role')
  const history = await sql.query<{ id: string }>(`insert into public.task_occurrences(household_id,series_id,title,recurrence,recurrence_every,due_at)
   values($1,$2,'Past','none',1,clock_timestamp()-interval '1 day'),($1,$2,'Completed','none',1,clock_timestamp()+interval '1 day') returning id`, [home, future.series])
  await user(member)
  await sql.query('select public.complete_household_task($1,true)', [history.rows[1].id])
  await user(outsider)
  await expect(sql.query('select public.archive_household_task($1,$2)', [home, future.series])).rejects.toThrow('Family access denied')
  await user(owner)
  await sql.query('select public.archive_household_task($1,$2)', [home, future.series])
  // This uses the calendar's household/date query, without hiding archived series in the client.
  const dates = await sql.query<{ id: string; completed_at: string | null }>(`select id,completed_at from public.task_occurrences where household_id=$1 and due_at>=clock_timestamp()-interval '2 days' and due_at<clock_timestamp()+interval '2 days'`, [home])
  expect(dates.rows.map(row => row.id).sort()).toEqual(history.rows.map(row => row.id).sort())
  expect(dates.rows.find(row => row.id === history.rows[1].id)?.completed_at).not.toBeNull()
  expect((await sql.query('select id from public.task_series where id=$1', [future.series])).rows).toHaveLength(1)
  await sql.query("select public.generate_task_occurrences($1,clock_timestamp()-interval '2 days',clock_timestamp()+interval '2 days')", [home])
  expect((await sql.query('select id from public.task_occurrences where series_id=$1', [future.series])).rows).toHaveLength(2)
  await sql.exec('reset role;set role service_role')
  expect((await sql.query("select id from public.claim_due_notifications(100) where source_id=$1", [`task:${future.occurrence}`])).rows).toHaveLength(0)
 } finally { await sql.close() }
}, 30000)

it('completion corrections never requeue sent reminders, but restore cancelled reminders exactly once', async () => {
 const { sql, user, task } = await fixture()
 try {
  for (const assigned of [member, null]) {
   await user(owner)
   const { occurrence } = await task(assigned)
   const source = `task:${occurrence}`
   await sql.exec('reset role;set role service_role')
   const claimed = await sql.query<{ id: string }>('select id from public.claim_due_notifications(100) where source_id=$1', [source])
   expect(claimed.rows.length).toBeGreaterThan(0)
   for (const row of claimed.rows) await sql.query("select public.finish_notification_delivery($1,'sent','')", [row.id])
   await user(member)
   await sql.query('select public.complete_household_task($1,true)', [occurrence])
   await sql.query('select public.complete_household_task($1,false)', [occurrence])
   await sql.query('select public.complete_household_task($1,true)', [occurrence])
   await sql.query('select public.complete_household_task($1,false)', [occurrence])
   await sql.exec('reset role')
   const reminders = await sql.query<{ status: string }>("select status from public.scheduled_notifications where source_id=$1 and delivery_kind='reminder'", [source])
   expect(reminders.rows).toHaveLength(assigned ? 1 : 2)
   expect(reminders.rows.every(row => row.status === 'sent')).toBe(true)
   const escalations = await sql.query<{ status: string }>("select status from public.scheduled_notifications where source_id=$1 and delivery_kind='overdue_escalation'", [source])
   expect(escalations.rows).toHaveLength(assigned ? 1 : 0)
   expect(escalations.rows.every(row => row.status === 'pending')).toBe(true)
   await sql.exec('set role service_role')
   expect((await sql.query('select id from public.claim_due_notifications(100) where source_id=$1', [source])).rows).toHaveLength(0)
  }
  // A worker may still be delivering a claimed reminder when completion cancels it.
  // Undo must not clear that claim and make a second worker send it again.
  await user(owner)
  const inFlight = await task(member)
  await sql.exec('reset role;set role service_role')
  expect((await sql.query('select id from public.claim_due_notifications(100) where source_id=$1', [`task:${inFlight.occurrence}`])).rows).toHaveLength(1)
  await user(member)
  await sql.query('select public.complete_household_task($1,true)', [inFlight.occurrence])
  await sql.query('select public.complete_household_task($1,false)', [inFlight.occurrence])
  await sql.exec('reset role')
  const inFlightNotice = (await sql.query<{status:string;claimed_at:string|null;attempts:number}>("select status,claimed_at,attempts from public.scheduled_notifications where source_id=$1 and delivery_kind='reminder'", [`task:${inFlight.occurrence}`])).rows[0]
  expect(inFlightNotice.status).toBe('cancelled')
  expect(inFlightNotice.claimed_at).not.toBeNull()
  expect(inFlightNotice.attempts).toBe(1)
  await sql.exec('set role service_role')
  expect((await sql.query('select id from public.claim_due_notifications(100) where source_id=$1', [`task:${inFlight.occurrence}`])).rows).toHaveLength(0)
  await user(owner)
  const { occurrence } = await task(member)
  await sql.query('select public.complete_household_task($1,true)', [occurrence])
  await sql.query('select public.complete_household_task($1,false)', [occurrence])
  await sql.exec('reset role;set role service_role')
  expect((await sql.query('select id from public.claim_due_notifications(100) where source_id=$1', [`task:${occurrence}`])).rows).toHaveLength(1)
 } finally { await sql.close() }
}, 30000)

it('the append-only migration cleans previously archived dates without deleting overdue history', async () => {
 const { sql, home, task } = await fixture(false)
 try {
  const { series, occurrence } = await task(member)
  await sql.exec('reset role')
  const past = (await sql.query<{ id: string }>(`insert into public.task_occurrences(household_id,series_id,title,recurrence,recurrence_every,due_at)
   values($1,$2,'Past','none',1,clock_timestamp()-interval '1 day') returning id`, [home, series])).rows[0].id
  await sql.query('select public.archive_household_task($1,$2)', [home, series])
  // The old implementation leaves the future occurrence behind.
  expect((await sql.query('select id from public.task_occurrences where id=$1', [occurrence])).rows).toHaveLength(1)
  await sql.exec(readFileSync('supabase/migrations/20261115140000_task_review_fixes.sql', 'utf8'))
  expect((await sql.query('select id from public.task_occurrences where series_id=$1', [series])).rows).toEqual([{ id: past }])
 } finally { await sql.close() }
}, 30000)

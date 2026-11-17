import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { taskFixture, owner, member, outsider } from './helpers/taskFixture'

it('keeps the first task date and reminder even beyond the rolling planning window', async () => {
 const { sql, home } = await taskFixture()
 try {
  const result = await sql.query<{ id: string }>("select public.save_household_task($1,null,'Next year','',null,clock_timestamp()+interval '1 year','none',1,null) id", [home])
  const occurrences = await sql.query<{ id: string }>('select id from public.task_occurrences where series_id=$1', [result.rows[0].id])
  expect(occurrences.rows).toHaveLength(1)
  expect((await sql.query("select id from public.scheduled_notifications where source_id=$1 and delivery_kind='reminder'", [`task:${occurrences.rows[0].id}`])).rows).toHaveLength(1)
 } finally { await sql.close() }
}, 30000)

it('rejects editing a stopped task instead of reporting a save with no open dates', async () => {
 const { sql, home, task } = await taskFixture()
 try {
  const { series } = await task(null)
  await sql.query('select public.archive_household_task($1,$2)', [home, series])
  await expect(sql.query("select public.save_household_task($1,$2,'Changed','',null,clock_timestamp()+interval '1 hour','none',1,null)", [home, series])).rejects.toThrow('Task is stopped')
 } finally { await sql.close() }
}, 30000)

it('releases a departing assignee and redirects pending reminders without changing completed history', async () => {
 const { sql, user, home, task } = await taskFixture()
 try {
  const open = await task(member)
  const done = await task(member)
  await user(member)
  await sql.query('select public.complete_household_task($1,true)', [done.occurrence])
  await sql.query('select public.leave_household($1,null)', [home])
  await user(owner)
  expect((await sql.query<{ assigned_to: string | null }>('select assigned_to from public.task_series where id=$1', [open.series])).rows[0].assigned_to).toBeNull()
  expect((await sql.query<{ assigned_to: string | null }>('select assigned_to from public.task_occurrences where id=$1', [open.occurrence])).rows[0].assigned_to).toBeNull()
  expect((await sql.query<{ completed_by: string }>('select completed_by from public.task_occurrences where id=$1', [done.occurrence])).rows[0].completed_by).toBe(member)
  await sql.exec('reset role')
  const pending = await sql.query<{ recipient_id: string; delivery_kind: string }>("select recipient_id,delivery_kind from public.scheduled_notifications where source_id=$1 and status='pending'", [`task:${open.occurrence}`])
  expect(pending.rows).toEqual([{ recipient_id: owner, delivery_kind: 'reminder' }])
 } finally { await sql.close() }
}, 30000)

it('keeps assignment changes inside the departed household and preserves task permissions', async () => {
 const { sql, user, home, task } = await taskFixture()
 try {
  const original = await task(member)
  await user(outsider)
  const other=(await sql.query<{id:string}>("select public.create_household('Other','UTC') id")).rows[0].id
  await sql.exec('reset role')
  await sql.query("insert into public.household_members(household_id,user_id,role) values($1,$2,'member')",[other,member])
  await user(outsider)
  const otherTask=(await sql.query<{id:string}>("select public.save_household_task($1,null,'Other task','',$2,clock_timestamp()+interval '2 hours','none',1,null) id",[other,member])).rows[0].id
  await expect(sql.query("select public.save_household_task($1,$2,'Intrusion','',null,clock_timestamp()+interval '1 hour','none',1,null)",[home,original.series])).rejects.toThrow('Family access denied')
  await expect(sql.query('select private.release_task_assignee($1,$2)',[home,member])).rejects.toThrow()
  await user(member)
  await sql.query('select public.leave_household($1,null)',[home])
  await user(outsider)
  expect((await sql.query<{assigned_to:string}>('select assigned_to from public.task_series where id=$1',[otherTask])).rows[0].assigned_to).toBe(member)
  const otherOccurrence=(await sql.query<{id:string}>('select id from public.task_occurrences where series_id=$1',[otherTask])).rows[0].id
  await user(owner)
  await expect(sql.query('select public.complete_household_task($1,true)',[otherOccurrence])).rejects.toThrow('Family access denied')
 } finally { await sql.close() }
}, 30000)

it('preserves household-local recurrence across daylight saving and short months', async () => {
 const { sql, home } = await taskFixture()
 try {
  await sql.exec('reset role')
  await sql.query("update public.households set timezone='Europe/Lisbon' where id=$1",[home])
  // Use a recent year so all dates fit the bounded generator independently of
  // when the university demo runs. The explicit generation window is fixed.
  const monthly=(await sql.query<{id:string}>("select public.save_household_task($1,null,'Monthly','',null,'2026-01-31T09:00Z','monthly',1,'2026-03-31') id",[home])).rows[0].id
  await sql.query("select public.generate_task_occurrences($1,'2026-01-01T00:00Z','2026-04-01T00:00Z')",[home])
  const months=await sql.query<{local:string}>("select to_char(due_at at time zone 'Europe/Lisbon','YYYY-MM-DD HH24:MI') local from public.task_occurrences where series_id=$1 order by due_at",[monthly])
  expect(months.rows.map(row=>row.local)).toEqual(['2026-01-31 09:00','2026-02-28 09:00','2026-03-31 09:00'])
  const daily=(await sql.query<{id:string}>("select public.save_household_task($1,null,'Daily DST','',null,'2026-03-28T09:00Z','daily',1,'2026-03-30') id",[home])).rows[0].id
  await sql.query("select public.generate_task_occurrences($1,'2026-03-28T00:00Z','2026-03-31T00:00Z')",[home])
  const days=await sql.query<{utc:string}>("select to_char(due_at at time zone 'UTC','YYYY-MM-DD HH24:MI') utc from public.task_occurrences where series_id=$1 order by due_at",[daily])
  expect(days.rows.map(row=>row.utc)).toEqual(['2026-03-28 09:00','2026-03-29 08:00','2026-03-30 08:00'])
 } finally { await sql.close() }
}, 30000)

it('repairs existing missing dates and departed assignees when upgrading the prior schema', async () => {
 const { sql, user, home, task } = await taskFixture(true,false)
 try {
  const open=await task(member)
  const distant=(await sql.query<{id:string}>("select public.save_household_task($1,null,'Distant','',null,clock_timestamp()+interval '1 year','none',1,null) id",[home])).rows[0].id
  expect((await sql.query('select id from public.task_occurrences where series_id=$1',[distant])).rows).toHaveLength(0)
  await user(member)
  await sql.query('select public.leave_household($1,null)',[home])
  await sql.exec('reset role')
  await sql.exec(readFileSync('supabase/migrations/20261117140000_tasks_reliability.sql','utf8'))
  expect((await sql.query<{assigned_to:string|null}>('select assigned_to from public.task_series where id=$1',[open.series])).rows[0].assigned_to).toBeNull()
  expect((await sql.query('select id from public.task_occurrences where series_id=$1',[distant])).rows).toHaveLength(1)
  const deliveries=await sql.query<{recipient_id:string;delivery_kind:string}>("select recipient_id,delivery_kind from public.scheduled_notifications where source_id=$1 and status='pending'",[`task:${open.occurrence}`])
  expect(deliveries.rows).toEqual([{recipient_id:owner,delivery_kind:'reminder'}])
 } finally { await sql.close() }
},30000)

import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

it('atomically schedules follow-ups once, updates/cancels them, preserves administered care and enforces membership', async () => {
 const sql = new PGlite()
 const owner='10000000-0000-0000-0000-000000000001', member='10000000-0000-0000-0000-000000000002', outsider='10000000-0000-0000-0000-000000000003'
 const home='20000000-0000-0000-0000-000000000001', other='20000000-0000-0000-0000-000000000002'
 const asUser=(id:string)=>sql.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`)
 try {
  await sql.exec(`create role anon;create role authenticated;create schema auth;create schema private;create schema storage;
   create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth,private to authenticated;grant execute on function auth.uid() to authenticated;
   create table households(id uuid primary key,timezone text not null);create table members(home uuid,user_id uuid);grant select on households to authenticated;
   create function private.is_member(h uuid) returns boolean language sql stable security definer as $$select exists(select 1 from public.members where home=h and user_id=auth.uid())$$;
   create table medication_schedules(id uuid primary key,household_id uuid);create table storage.objects(bucket_id text,name text);
   insert into auth.users values('${owner}'),('${member}'),('${outsider}');insert into households values('${home}','Europe/Lisbon'),('${other}','UTC');
   insert into members values('${home}','${owner}'),('${home}','${member}'),('${other}','${outsider}');`)
  for(const file of ['202611110002_vet_appointments.sql','202611110004_vaccinations.sql','20261118120000_appointment_summaries.sql','20261119010000_summary_followups.sql']) await sql.exec(readFileSync('supabase/migrations/'+file,'utf8'))
  await asUser(owner)
  const visit=(await sql.query<{id:string}>(`insert into vet_appointments(household_id,title,starts_at,location) values($1,'Checkup','2020-01-01','Clinic') returning id`,[home])).rows[0].id
  const save=(date:string|null,kind='vaccination',name='Rabies')=>sql.query(`insert into appointment_summaries(appointment_id,next_visit_at,next_visit_kind,next_vaccine_name) values($1,$2,$3,$4) on conflict(appointment_id) do update set next_visit_at=excluded.next_visit_at,next_visit_kind=excluded.next_visit_kind,next_vaccine_name=excluded.next_vaccine_name`,[visit,date,kind,name])
  await save('2099-07-01T23:30Z')
  const vaccine=async()=>(await sql.query<{id:string;given_on:string|null;next_due_on:string;household_id:string}>(`select id,given_on,next_due_on::text,household_id from vaccinations`)).rows
  let rows=await vaccine();expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({given_on:null,next_due_on:'2099-07-02',household_id:home});const vaccineId=rows[0].id
  await save('2099-07-01T23:30Z');expect((await vaccine())[0].id).toBe(vaccineId)
  await asUser(member);await save('2099-08-01T10:00Z');expect((await vaccine())[0]).toMatchObject({id:vaccineId,next_due_on:'2099-08-01'})
  await expect(save('2099-09-01T10:00Z','vaccination','')).rejects.toThrow()
  expect((await vaccine())[0].next_due_on).toBe('2099-08-01')
  await save(null);expect(await vaccine()).toHaveLength(0)
  await save('2099-09-01T10:00Z','consultation','')
  const appointments=async()=>(await sql.query<{id:string}>(`select id from vet_appointments where source_summary_id=$1`,[visit])).rows
  const followup=(await appointments())[0].id
  await save('2099-09-02T10:00Z','consultation','');expect((await appointments())[0].id).toBe(followup)
  await save('2099-10-01T10:00Z');expect(await appointments()).toHaveLength(0);expect(await vaccine()).toHaveLength(1)
  await sql.query(`update vaccinations set given_on='2020-01-02',next_due_on=null`)
  await sql.query(`update appointment_summaries set observations='Dose given' where appointment_id=$1`,[visit]);await save('2099-10-01T10:00Z');expect(await vaccine()).toHaveLength(1)
  await save(null);rows=await vaccine();expect(rows).toHaveLength(1);expect(rows[0].given_on).not.toBeNull()
  await expect(sql.query(`update vaccinations set source_summary_id=$1`,[visit])).rejects.toThrow()
  await expect(sql.query(`update vet_appointments set source_summary_id=$1`,[visit])).rejects.toThrow()
  await asUser(outsider);await expect(save('2099-11-01T10:00Z')).rejects.toThrow();expect(await vaccine()).toHaveLength(0)
  await asUser(owner);expect(await vaccine()).toHaveLength(1)
  await sql.exec(`reset role;delete from members where user_id='${member}'`);await asUser(member);await expect(save('2099-12-01T10:00Z')).rejects.toThrow()
  await sql.exec('reset role;set role anon');await expect(sql.query('select * from appointment_summaries')).rejects.toThrow()
 } finally { await sql.close() }
},30000)

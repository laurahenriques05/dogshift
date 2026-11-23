import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {it,expect} from 'vitest'
it('enforces the scheduled local day on the server without changing rejected doses',async()=>{
 const sql=new PGlite(),id='10000000-0000-0000-0000-000000000001'
 try{
 await sql.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`)
 for(const f of ['202611070001_initial_schema.sql','202611110003_medications.sql','20261123160000_medication_same_day.sql'])await sql.exec(readFileSync('supabase/migrations/'+f,'utf8'))
 await sql.exec(`insert into auth.users(id) values('${id}');set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`)
 const home=(await sql.query<{id:string}>("select public.create_household('Test','Pacific/Kiritimati') id")).rows[0].id
 await sql.query("select public.save_medication_schedule($1,null,'Medication','Instructions',array[clock_timestamp()-interval '1 day',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 day'])",[home])
 const doses=(await sql.query<{id:string}>('select id from public.medication_doses order by scheduled_at')).rows
 for(const dose of [doses[0],doses[2]])await expect(sql.query("select public.log_medication_dose($1,'given',clock_timestamp(),'')",[dose.id])).rejects.toThrow('scheduled day')
 await expect(sql.query("select public.log_medication_dose($1,'given',clock_timestamp()-interval '1 day','')",[doses[1].id])).rejects.toThrow('scheduled day')
 await sql.query("select public.log_medication_dose($1,'given',clock_timestamp(),'')",[doses[1].id])
 expect((await sql.query("select status from public.medication_doses where id=$1",[doses[1].id])).rows[0].status).toBe('given')
 expect((await sql.query("select count(*)::int n from public.medication_doses where status='scheduled'")).rows[0].n).toBe(2)
 }finally{await sql.close()}
},30000)

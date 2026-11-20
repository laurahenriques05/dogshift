import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it } from 'vitest'
const sql=new PGlite()
const a='60000000-0000-0000-0000-000000000001',b='60000000-0000-0000-0000-000000000002',c='60000000-0000-0000-0000-000000000003'
let home:string,dog:string,walk:string
async function asUser(id:string){await sql.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`)}
beforeAll(async()=>{
 await sql.exec(`create role anon nologin;create role authenticated nologin;create schema auth;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`)
 for(const name of ['202611070001_initial_schema.sql','202611110001_walks.sql','20261120155307_shared_walk_history_deletion.sql'])await sql.exec(readFileSync(`supabase/migrations/${name}`,'utf8'))
 await sql.exec(`insert into auth.users(id) values('${a}'),('${b}'),('${c}')`);await asUser(a)
 home=(await sql.query<{id:string}>("select public.create_household('Deletion test','Europe/Lisbon') id")).rows[0].id
 dog=(await sql.query<{id:string}>("insert into public.dogs(household_id,name) values($1,'Milo') returning id",[home])).rows[0].id
 await sql.exec(`reset role;insert into public.household_members(household_id,user_id,role) values('${home}','${b}','member')`);await asUser(a)
 walk=(await sql.query<{id:string}>('select id from public.start_walk($1)',[dog])).rows[0].id
},30000)
afterAll(()=>sql.close())
it('allows members to delete completed walks, retaining author-only restoration and isolation',async()=>{
 await asUser(b);await expect(sql.query('select public.set_walk_deleted($1,true)',[walk])).rejects.toThrow('Finish the walk')
 await asUser(a);await sql.query('select public.finish_walk($1,clock_timestamp())',[walk])
 await asUser(c);await expect(sql.query('select public.set_walk_deleted($1,true)',[walk])).rejects.toThrow('Household member')
 await asUser(b);await sql.query('select public.set_walk_deleted($1,true)',[walk]);expect((await sql.query('select * from public.walks')).rows).toHaveLength(0)
 await expect(sql.query('select public.set_walk_deleted($1,false)',[walk])).rejects.toThrow('Walker access')
 await asUser(a);expect((await sql.query<{deleted_at:string}>('select deleted_at from public.walks where id=$1',[walk])).rows[0].deleted_at).toBeTruthy()
 await sql.query('select public.set_walk_deleted($1,false)',[walk])
 await asUser(b);expect((await sql.query('select * from public.walks')).rows).toHaveLength(1)
 await sql.exec(`reset role;delete from public.household_members where user_id='${b}'`);await asUser(b)
 await expect(sql.query('select public.set_walk_deleted($1,true)',[walk])).rejects.toThrow('Household member')
 await asUser('');await expect(sql.query('select public.set_walk_deleted($1,true)',[walk])).rejects.toThrow('Household member')
 await sql.exec('reset role;set role anon');await expect(sql.query('select public.set_walk_deleted($1,true)',[walk])).rejects.toThrow('permission denied')
})

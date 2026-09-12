import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

async function main() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text,name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as
      $$ select string_to_array(name,'/') $$;
    grant usage on schema auth,storage to authenticated,anon;
    grant select,insert,delete on storage.objects to authenticated;
  `);
  // PGlite has core gen_random_uuid; Supabase supplies pgcrypto in production.
  const schema = (await readFile("supabase/schema.sql", "utf8")).replace(
    "create extension if not exists pgcrypto;",
    "",
  );
  await db.exec(schema);
  await db.exec(await readFile("supabase/migrations/20260911_launch.sql", "utf8"));
  const alice = "11111111-1111-4111-8111-111111111111";
  const bob = "22222222-2222-4222-8222-222222222222";
  const trip = "33333333-3333-4333-8333-333333333333";
  await db.query("insert into auth.users(id,raw_user_meta_data) values($1,$3),($2,$4)", [
    alice,
    bob,
    { name: "Alice" },
    { name: "Bob" },
  ]);
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [alice]);
  await db.query(
    "insert into public.trips(id,owner_id,name,destination,start_date,end_date,budget,data) values($1,$2,'Roma 2027','Roma','2027-07-12','2027-07-20',8000,'{}')",
    [trip, alice],
  );
  await db.query("insert into public.trip_members(trip_id,name) values($1,'Alice')", [trip]);
  await db.query("insert into storage.objects(bucket_id,name) values('travel-documents',$1)", [
    `${alice}/${trip}/ticket.pdf`,
  ]);
  await db.query("select public.save_preferences($1,$2,$3,$4)", [
    "Alice viajante",
    "Brasília",
    ["italia"],
    ["roma", "roma"],
  ]);
  assert.equal((await db.query("select * from public.favorites")).rows.length, 1);
  assert.equal((await db.query("select * from public.trips")).rows.length, 1);
  assert.equal((await db.query("select * from public.profiles")).rows.length, 1);

  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [bob]);
  for (const table of ["trips", "trip_members", "favorites"]) {
    assert.equal((await db.query(`select * from public.${table}`)).rows.length, 0, table);
  }
  assert.equal((await db.query("select * from storage.objects")).rows.length, 0);
  await assert.rejects(
    db.query("insert into public.trip_members(trip_id,name) values($1,'Invader')", [trip]),
    /row-level security/i,
  );
  await assert.rejects(
    db.query("insert into storage.objects(bucket_id,name) values('travel-documents',$1)", [
      `${alice}/${trip}/intrusion.pdf`,
    ]),
    /row-level security/i,
  );
  await assert.rejects(
    db.query("insert into storage.objects(bucket_id,name) values('travel-documents',$1)", [
      `${bob}/${trip}/intrusion.pdf`,
    ]),
    /row-level security/i,
  );
  const update = await db.query(
    "update public.trips set name='Intrusion' where id=$1 returning id",
    [trip],
  );
  assert.equal(update.rows.length, 0);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [alice]);
  await assert.rejects(
    db.query("update public.trips set owner_id=$1 where id=$2", [bob, trip]),
    /row-level security/i,
  );
  await assert.rejects(
    db.query("update public.trips set end_date='2027-07-01' where id=$1", [trip]),
    /check constraint/i,
  );
  const name = await db.query<{ name: string }>("select name from public.trips where id=$1", [
    trip,
  ]);
  assert.equal(name.rows[0].name, "Roma 2027");
  // Launch rules: free quota, server-only billing, publication and revocation.
  const secondTrip = "44444444-4444-4444-8444-444444444444";
  const thirdTrip = "55555555-5555-4555-8555-555555555555";
  const insertTrip = (id: string) =>
    db.query(
      "insert into public.trips(id,owner_id,name,destination,start_date,end_date,data) values($1,$2,'Outra viagem','Lisboa','2027-01-01','2027-01-03','{}')",
      [id, alice],
    );
  await insertTrip(secondTrip);
  await assert.rejects(insertTrip(thirdTrip), /até 2 viagens/);
  await assert.rejects(
    db.query("select public.publish_trip($1,$2)", [trip, "Dicas públicas para testar."]),
    /Creator ativo/,
  );
  await assert.rejects(
    db.exec(
      "insert into public.billing_customers(user_id,customer_id) values(auth.uid(),'cus_forged')",
    ),
    /permission denied/,
  );
  await assert.rejects(
    db.exec(
      "select public.apply_subscription_event('fake','fake','fake','creator','active',now(),false,now())",
    ),
    /permission denied/,
  );
  await db.exec("reset role");
  await db.query(
    "insert into public.billing_customers(user_id,customer_id) values($1,'cus_alice')",
    [alice],
  );
  const sync = (
    event: string,
    status: string,
    observed: string,
    plan = "creator",
    end = "2099-01-01",
  ) =>
    db.query(
      "select public.apply_subscription_event($1,'sub_alice','cus_alice',$4,$2,$5,false,$3)",
      [event, status, observed, plan, end],
    );
  await sync("evt_active", "active", "2026-09-11T10:00:00Z");
  await db.exec("set role authenticated");
  await insertTrip(thirdTrip);
  const privateData = {
    activities: [
      {
        day: 1,
        name: "Museu",
        time: "10:00",
        duration: "2h",
        category: "Cultura",
        location: "Centro",
        cost: 99,
        file: "secret-activity-file",
      },
    ],
    documents: [{ reference: "PRIVATE-PASSPORT" }],
    expenses: [{ amount: 500 }],
    members: [{ email: "PRIVATE-EMAIL" }],
    notes: [{ text: "PRIVATE-DIARY" }],
  };
  await db.query("update public.trips set data=$1 where id=$2", [privateData, trip]);
  const published = await db.query<{ id: string }>("select public.publish_trip($1,$2) as id", [
    trip,
    "Visite o museu pela manhã.",
  ]);
  const routeId = published.rows[0].id;
  const again = await db.query<{ id: string }>("select public.publish_trip($1,$2) as id", [
    trip,
    "Visite o museu durante a manhã.",
  ]);
  assert.equal(again.rows[0].id, routeId, "Updating a publication retains its link");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [bob]);
  assert.equal((await db.query("select * from public.subscriptions")).rows.length, 0);
  await db.query("select public.unpublish_trip($1)", [trip]);
  await db.exec("set role anon");
  await db.exec("select set_config('request.jwt.claim.sub','',false)");
  const publicRows = await db.query<{ activities: unknown }>(
    "select id,title,tips,activities from public.published_routes",
  );
  assert.equal(publicRows.rows.length, 1, "Another user cannot unpublish a trip");
  const serialized = JSON.stringify(publicRows.rows);
  for (const secret of [
    "PRIVATE",
    "secret-activity-file",
    "cost",
    "expenses",
    "documents",
    "members",
    "notes",
  ])
    assert.ok(!serialized.includes(secret), secret);
  await assert.rejects(db.exec("select * from public.trips"), /permission denied/);
  await assert.rejects(
    db.query("select public.publish_trip($1,$2)", [trip, "Tentativa de acesso anônimo"]),
    /permission denied/,
  );
  await db.exec("reset role");
  await sync("evt_canceled", "canceled", "2026-09-11T11:00:00Z");
  await sync("evt_old", "active", "2026-09-11T09:00:00Z");
  await sync("evt_active", "active", "2026-09-11T12:00:00Z");
  assert.equal(
    (await db.query<{ status: string }>("select status from public.subscriptions")).rows[0].status,
    "canceled",
    "Old and duplicate events cannot restore access",
  );
  await db.exec("set role anon");
  assert.equal((await db.query("select id from public.published_routes")).rows.length, 0);
  await db.exec("reset role");
  await sync("evt_expired", "active", "2026-09-11T13:00:00Z", "creator", "2000-01-01");
  await db.exec("set role anon");
  assert.equal(
    (await db.query("select id from public.published_routes")).rows.length,
    0,
    "Expired entitlement is hidden even without a webhook",
  );
  await db.exec("reset role");
  await sync("evt_reactivated", "active", "2026-09-11T14:00:00Z");
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [alice]);
  await db.query("select public.unpublish_trip($1)", [trip]);
  await db.exec("set role anon");
  await db.exec("select set_config('request.jwt.claim.sub','',false)");
  assert.equal(
    (await db.query("select id from public.published_routes")).rows.length,
    0,
    "Unpublished route is no longer accessible anonymously",
  );
  await db.exec("reset role");
  const attempt1 = await db.query<{ id: string }>(
    "select (public.checkout_attempt($1,'plus')).id",
    [alice],
  );
  const attempt2 = await db.query<{ id: string }>(
    "select (public.checkout_attempt($1,'plus')).id",
    [alice],
  );
  assert.equal(
    attempt1.rows[0].id,
    attempt2.rows[0].id,
    "Checkout retries reuse their idempotency key",
  );
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [alice]);
  await assert.rejects(
    db.query("select public.checkout_attempt($1,'creator')", [alice]),
    /permission denied/,
  );
  await assert.rejects(db.exec("select * from public.storage_cleanup"), /permission denied/);
  const original = await db.query<{ revision: number }>(
    "select revision from public.trips where id=$1",
    [trip],
  );
  const rev = original.rows[0].revision;
  const update1 = await db.query(
    "update public.trips set name='Alterada' where id=$1 and revision=$2 returning revision",
    [trip, rev],
  );
  const update2 = await db.query(
    "update public.trips set name='Edição antiga' where id=$1 and revision=$2 returning revision",
    [trip, rev],
  );
  assert.equal(update1.rows.length, 1);
  assert.equal(update2.rows.length, 0, "Stale edits cannot overwrite a newer version");
  const path = `${alice}/${trip}/to-delete.pdf`;
  await db.query("update public.trips set data=$1 where id=$2", [
    { documents: [{ file: path }, { file: `${bob}/${trip}/foreign.pdf` }] },
    trip,
  ]);
  await db.query("update public.trips set data='{}' where id=$1", [trip]);
  await db.exec("reset role");
  const queued = await db.query<{ path: string }>("select path from public.storage_cleanup");
  assert.deepEqual(
    queued.rows.map((r) => r.path),
    [path],
    "Only files under the owner's trip can be queued for deletion",
  );
  await db.exec("set role authenticated");
  await db.query("delete from public.trips where id=$1", [trip]);
  await db.exec("reset role");
  assert.equal(
    (await db.query("select id from public.published_routes")).rows.length,
    0,
    "Deleting a trip also deletes the public route",
  );
  await db.close();
  console.log(
    "Schema validado: RLS entre contas e Storage; limite Free; cobrança restrita ao servidor; eventos duplicados/atrasados; publicação sem dados privados; cancelamento, expiração e retirada de publicação.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

-- Apply after schema.sql, once, to both existing and new projects.
begin;
alter table public.trips add column revision integer not null default 0;
create function public.bump_trip_revision() returns trigger language plpgsql set search_path='' as $$
begin new.revision=old.revision+1; return new; end; $$;
revoke all on function public.bump_trip_revision() from public,anon,authenticated;
create trigger bump_trip_revision before update on public.trips for each row execute function public.bump_trip_revision();

create table public.storage_cleanup (
  path text primary key,
  created_at timestamptz not null default now()
);
alter table public.storage_cleanup enable row level security;
revoke all on public.storage_cleanup from anon,authenticated;
grant all on public.storage_cleanup to service_role;
create function public.queue_removed_files() returns trigger language plpgsql security definer set search_path='' as $$
declare document jsonb; file_path text;
begin
  for document in select * from jsonb_array_elements(coalesce(old.data->'documents','[]'::jsonb)) loop
    file_path=document->>'file';
    if file_path like old.owner_id::text||'/'||old.id::text||'/%' then
      if tg_op='DELETE' or not exists(select 1 from jsonb_array_elements(coalesce(new.data->'documents','[]'::jsonb)) d where d->>'file'=file_path) then
        insert into public.storage_cleanup(path) values(file_path) on conflict do nothing;
      end if;
    end if;
  end loop;
  return null;
end; $$;
revoke all on function public.queue_removed_files() from public,anon,authenticated;
create trigger queue_removed_files after update or delete on public.trips for each row execute function public.queue_removed_files();
create table public.billing_customers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  customer_id text not null unique,
  created_at timestamptz not null default now()
);
create table public.subscriptions (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_id text not null references public.billing_customers(customer_id) on delete cascade,
  plan text not null check (plan in ('free','plus','creator')),
  status text not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  synced_at timestamptz not null default now()
);
create index subscriptions_user_idx on public.subscriptions(user_id);
create table public.billing_events(id text primary key, processed_at timestamptz not null default now());
create table public.checkout_attempts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  plan text not null check(plan in ('plus','creator')),
  created_at timestamptz not null default now()
);
alter table public.checkout_attempts enable row level security;
revoke all on public.checkout_attempts from anon,authenticated;
grant all on public.checkout_attempts to service_role;
create function public.checkout_attempt(account uuid, selected_plan text) returns public.checkout_attempts
language plpgsql security invoker set search_path='' as $$
declare result public.checkout_attempts;
begin
  insert into public.checkout_attempts(user_id,plan) values(account,selected_plan)
  on conflict(user_id) do update set
    id=case when public.checkout_attempts.created_at<now()-interval '10 minutes' then gen_random_uuid() else public.checkout_attempts.id end,
    plan=case when public.checkout_attempts.created_at<now()-interval '10 minutes' then excluded.plan else public.checkout_attempts.plan end,
    created_at=case when public.checkout_attempts.created_at<now()-interval '10 minutes' then now() else public.checkout_attempts.created_at end
  returning * into result;
  return result;
end; $$;
revoke all on function public.checkout_attempt(uuid,text) from public,anon,authenticated;
grant execute on function public.checkout_attempt(uuid,text) to service_role;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
create policy billing_customer_read on public.billing_customers for select to authenticated using(user_id=(select auth.uid()));
create policy subscription_read on public.subscriptions for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.billing_customers,public.subscriptions,public.billing_events from anon,authenticated;
grant select on public.billing_customers,public.subscriptions to authenticated;
grant all on public.billing_customers,public.subscriptions,public.billing_events to service_role;

create function public.apply_subscription_event(event_id text, subscription_id text, stripe_customer text, subscription_plan text, subscription_status text, period_end timestamptz, cancel_at_end boolean, observed_at timestamptz)
returns void language plpgsql security invoker set search_path='' as $$
declare account uuid;
begin
  insert into public.billing_events(id) values(event_id) on conflict do nothing;
  if not found then return; end if;
  select user_id into account from public.billing_customers where customer_id=stripe_customer;
  -- Ignore late events for deleted accounts or other products in this Stripe account.
  if account is null then return; end if;
  insert into public.subscriptions(id,user_id,customer_id,plan,status,current_period_end,cancel_at_period_end,synced_at)
  values(subscription_id,account,stripe_customer,subscription_plan,subscription_status,period_end,cancel_at_end,observed_at)
  on conflict(id) do update set plan=excluded.plan,status=excluded.status,current_period_end=excluded.current_period_end,
    cancel_at_period_end=excluded.cancel_at_period_end,synced_at=excluded.synced_at
  where public.subscriptions.synced_at <= excluded.synced_at;
end;
$$;
revoke all on function public.apply_subscription_event(text,text,text,text,text,timestamptz,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.apply_subscription_event(text,text,text,text,text,timestamptz,boolean,timestamptz) to service_role;

create function public.account_plan(account uuid) returns text
language sql stable security definer set search_path='' as $$
  select coalesce((select plan from public.subscriptions where user_id=account and status in ('active','trialing')
    and current_period_end>now() and plan in ('plus','creator') order by (plan='creator') desc limit 1),'free');
$$;
revoke all on function public.account_plan(uuid) from public,anon,authenticated;

create function public.enforce_trip_limit() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  -- Serialize inserts per owner: simultaneous requests cannot evade the limit.
  perform 1 from public.profiles where id=new.owner_id for update;
  if not exists(select 1 from public.trips where id=new.id) and public.account_plan(new.owner_id)='free'
    and (select count(*) from public.trips where owner_id=new.owner_id)>=2 then
    raise exception 'Seu plano Free permite até 2 viagens. Escolha o Plus para criar mais.';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_trip_limit() from public,anon,authenticated;
create trigger enforce_trip_limit before insert on public.trips for each row execute function public.enforce_trip_limit();

create table public.published_routes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  destination text not null,
  author text not null,
  days integer not null check(days between 1 and 366),
  tips text not null check(char_length(tips) between 10 and 5000),
  activities jsonb not null,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.published_routes enable row level security;
create function public.route_is_visible(account uuid) returns boolean
language sql stable security definer set search_path='' as $$ select public.account_plan(account)='creator'; $$;
revoke all on function public.route_is_visible(uuid) from public;
grant execute on function public.route_is_visible(uuid) to anon,authenticated;
create policy public_route_read on public.published_routes for select to anon,authenticated
using((published and public.route_is_visible(owner_id)) or owner_id=(select auth.uid()));
revoke all on public.published_routes from anon,authenticated;
grant usage on schema public to anon;
grant select(id,title,destination,author,days,tips,activities,published,updated_at,trip_id,owner_id) on public.published_routes to anon,authenticated;
grant all on public.published_routes to service_role;

create function public.publish_trip(target_trip uuid, public_tips text) returns uuid
language plpgsql security definer set search_path='' as $$
declare source public.trips; route_id uuid; safe_activities jsonb; author_name text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para publicar.'; end if;
  if public.account_plan(auth.uid()) <> 'creator' then raise exception 'A publicação requer o plano Creator ativo.'; end if;
  select * into source from public.trips where id=target_trip and owner_id=auth.uid() for update;
  if source.id is null then raise exception 'Viagem não encontrada.'; end if;
  if char_length(trim(public_tips)) not between 10 and 5000 then raise exception 'Escreva dicas entre 10 e 5000 caracteres.'; end if;
  if source.end_date-source.start_date not between 0 and 365 then raise exception 'O roteiro público deve ter no máximo 366 dias.'; end if;
  -- Deliberate allowlist. No documents, attachments, expenses, members, diary,
  -- booking references, exact calendar dates or user-supplied image URLs.
  select coalesce(jsonb_agg(jsonb_build_object(
    'day',case when a->>'day' ~ '^[0-9]{1,3}$' then greatest(1,least(366,(a->>'day')::integer)) else 1 end,'time',left(a->>'time',5),'name',left(a->>'name',200),
    'category',left(a->>'category',80),'duration',left(a->>'duration',80),
    'location',left(a->>'location',200))),'[]'::jsonb)
  into safe_activities from jsonb_array_elements(coalesce(source.data->'activities','[]'::jsonb)) a;
  if jsonb_array_length(safe_activities)>1000 then raise exception 'O roteiro deve ter até 1000 atividades.'; end if;
  select name into author_name from public.profiles where id=auth.uid();
  insert into public.published_routes(trip_id,owner_id,title,destination,author,days,tips,activities)
  values(source.id,auth.uid(),source.name,left(source.destination,200),left(author_name,80),source.end_date-source.start_date+1,trim(public_tips),safe_activities)
  on conflict(trip_id) do update set title=excluded.title,destination=excluded.destination,author=excluded.author,days=excluded.days,
    tips=excluded.tips,activities=excluded.activities,published=true,updated_at=now()
  returning id into route_id;
  return route_id;
end;
$$;
create function public.unpublish_trip(target_trip uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
  update public.published_routes set published=false,updated_at=now() where trip_id=target_trip and owner_id=auth.uid();
end;
$$;
revoke all on function public.publish_trip(uuid,text),public.unpublish_trip(uuid) from public,anon;
grant execute on function public.publish_trip(uuid,text),public.unpublish_trip(uuid) to authenticated;
commit;

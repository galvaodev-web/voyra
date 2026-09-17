-- Voyra Web 1.0: trusted completion, collectible Tokens and durable operations.
-- Apply after 20260915_price_engine.sql.
begin;

alter table public.trips
  add column completion_status text not null default 'ACTIVE'
    check (completion_status in ('ACTIVE','COMPLETED')),
  add column completion_requested_at timestamptz,
  add column completed_at timestamptz;
create index trips_completed_owner_idx
  on public.trips(owner_id,completed_at desc) where completion_status='COMPLETED';

create sequence public.travel_token_serial_seq;
revoke all on sequence public.travel_token_serial_seq from public,anon,authenticated;
grant usage,select on sequence public.travel_token_serial_seq to service_role;

create table public.travel_tokens (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  share_slug text not null default replace(gen_random_uuid()::text,'-','') unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  token_type text not null check (token_type in ('JOURNEY','COUNTRY','CITY','ACHIEVEMENT')),
  destination text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  country_name text,
  cities text[] not null default '{}',
  travel_year integer check(travel_year is null or travel_year between 1900 and 2200),
  start_date date,
  end_date date,
  days integer check(days is null or days between 1 and 366),
  verified_place_count integer not null default 0 check(verified_place_count>=0),
  serial_number text not null unique check(serial_number ~ '^VOY-[A-Z0-9]{3}-[0-9]{4}-[0-9]{6}$'),
  achievement_code text,
  rarity text not null default 'COMMON' check (rarity in ('COMMON','UNCOMMON','RARE','EPIC')),
  verification text not null default 'TRAVEL_SERVER' check(verification in ('TRAVEL_SERVER','ADMIN')),
  visible boolean not null default true,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED')),
  public_recap_id uuid,
  issued_at timestamptz not null default now()
);
create unique index travel_tokens_journey_unique
  on public.travel_tokens(trip_id) where token_type='JOURNEY';
create unique index travel_tokens_country_unique
  on public.travel_tokens(user_id,lower(country_name)) where token_type='COUNTRY';
create unique index travel_tokens_city_unique
  on public.travel_tokens(user_id,lower(destination)) where token_type='CITY';
create unique index travel_tokens_achievement_unique
  on public.travel_tokens(user_id,achievement_code) where token_type='ACHIEVEMENT';
create index travel_tokens_user_issued_idx on public.travel_tokens(user_id,issued_at desc);
create index travel_tokens_public_recap_idx on public.travel_tokens(public_recap_id)
  where public_recap_id is not null;
alter table public.travel_tokens enable row level security;
create policy travel_tokens_owner_read on public.travel_tokens for select to authenticated
  using(user_id=(select auth.uid()));
create policy travel_tokens_owner_visibility on public.travel_tokens for update to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
revoke all on public.travel_tokens from public,anon,authenticated;
grant select on public.travel_tokens to authenticated;
grant update(visible) on public.travel_tokens to authenticated;
grant all on public.travel_tokens to service_role;

create function public.issue_trip_tokens(target_trip uuid) returns void
language plpgsql security definer set search_path='' as $$
declare
  t public.trips;
  country text;
  country_code_value text;
  destination_code text;
  token_year integer;
  token_days integer;
  place_count integer;
  journey_count integer;
  country_count integer;
  city_count integer;
  serial_value bigint;
begin
  select * into t from public.trips
  where id=target_trip and owner_id=auth.uid() and completion_status='COMPLETED';
  if t.id is null then raise exception 'COMPLETED_TRIP_REQUIRED'; end if;
  country := nullif(trim(coalesce(t.data->>'country','')), '');
  country_code_value := nullif(upper(trim(coalesce(t.data->>'countryCode',''))), '');
  if country_code_value !~ '^[A-Z]{2}$' then country_code_value := null; end if;
  destination_code := left(regexp_replace(upper(t.destination),'[^A-Z0-9]','','g')||'VOY',3);
  token_year := extract(year from t.end_date)::integer;
  token_days := greatest(1,(t.end_date-t.start_date)+1);
  place_count := case
    when jsonb_typeof(coalesce(t.data->'activities','[]'::jsonb))='array'
    then jsonb_array_length(coalesce(t.data->'activities','[]'::jsonb)) else 0 end;

  if not exists(select 1 from public.travel_tokens where trip_id=t.id and token_type='JOURNEY') then
    serial_value := nextval('public.travel_token_serial_seq');
    insert into public.travel_tokens(
      user_id,trip_id,token_type,destination,country_code,country_name,cities,travel_year,
      start_date,end_date,days,verified_place_count,serial_number,rarity
    ) values(
      t.owner_id,t.id,'JOURNEY',t.destination,country_code_value,country,array[t.destination],token_year,
      t.start_date,t.end_date,token_days,place_count,
      'VOY-'||destination_code||'-'||token_year||'-'||lpad(serial_value::text,6,'0'),'COMMON'
    );
  end if;

  if not exists(
    select 1 from public.travel_tokens where user_id=t.owner_id and token_type='CITY'
      and lower(destination)=lower(t.destination)
  ) then
    serial_value := nextval('public.travel_token_serial_seq');
    insert into public.travel_tokens(
      user_id,trip_id,token_type,destination,country_code,country_name,cities,travel_year,
      start_date,end_date,days,verified_place_count,serial_number,rarity
    ) values(
      t.owner_id,t.id,'CITY',t.destination,country_code_value,country,array[t.destination],token_year,
      t.start_date,t.end_date,token_days,place_count,
      'VOY-'||destination_code||'-'||token_year||'-'||lpad(serial_value::text,6,'0'),'COMMON'
    );
  end if;

  if country is not null and not exists(
    select 1 from public.travel_tokens where user_id=t.owner_id and token_type='COUNTRY'
      and lower(country_name)=lower(country)
  ) then
    serial_value := nextval('public.travel_token_serial_seq');
    insert into public.travel_tokens(
      user_id,trip_id,token_type,destination,country_code,country_name,travel_year,
      start_date,end_date,days,verified_place_count,serial_number,rarity
    ) values(
      t.owner_id,t.id,'COUNTRY',t.destination,country_code_value,country,token_year,
      t.start_date,t.end_date,token_days,place_count,
      'VOY-'||left(coalesce(country_code_value,destination_code)||'XXX',3)||'-'||token_year||'-'||lpad(serial_value::text,6,'0'),'UNCOMMON'
    );
  end if;

  select count(*) into journey_count from public.travel_tokens
    where user_id=t.owner_id and token_type='JOURNEY' and status='ACTIVE';
  select count(*) into country_count from public.travel_tokens
    where user_id=t.owner_id and token_type='COUNTRY' and status='ACTIVE';
  select count(*) into city_count from public.travel_tokens
    where user_id=t.owner_id and token_type='CITY' and status='ACTIVE';

  if journey_count>=1 and not exists(
    select 1 from public.travel_tokens where user_id=t.owner_id and token_type='ACHIEVEMENT'
      and achievement_code='FIRST_COMPLETED_TRIP'
  ) then
    serial_value := nextval('public.travel_token_serial_seq');
    insert into public.travel_tokens(user_id,trip_id,token_type,destination,country_name,travel_year,
      start_date,end_date,days,verified_place_count,serial_number,achievement_code,rarity)
    values(t.owner_id,t.id,'ACHIEVEMENT',t.destination,country,token_year,t.start_date,t.end_date,
      token_days,place_count,'VOY-FST-'||token_year||'-'||lpad(serial_value::text,6,'0'),
      'FIRST_COMPLETED_TRIP','UNCOMMON');
  end if;
  if country_count>=5 and not exists(
    select 1 from public.travel_tokens where user_id=t.owner_id and token_type='ACHIEVEMENT'
      and achievement_code='FIVE_COUNTRIES'
  ) then
    serial_value := nextval('public.travel_token_serial_seq');
    insert into public.travel_tokens(user_id,trip_id,token_type,travel_year,serial_number,achievement_code,rarity)
    values(t.owner_id,t.id,'ACHIEVEMENT',token_year,
      'VOY-CT5-'||token_year||'-'||lpad(serial_value::text,6,'0'),'FIVE_COUNTRIES','RARE');
  end if;
  if country_count>=10 and not exists(
    select 1 from public.travel_tokens where user_id=t.owner_id and token_type='ACHIEVEMENT'
      and achievement_code='TEN_COUNTRIES'
  ) then
    serial_value := nextval('public.travel_token_serial_seq');
    insert into public.travel_tokens(user_id,trip_id,token_type,travel_year,serial_number,achievement_code,rarity)
    values(t.owner_id,t.id,'ACHIEVEMENT',token_year,
      'VOY-10C-'||token_year||'-'||lpad(serial_value::text,6,'0'),'TEN_COUNTRIES','EPIC');
  end if;
  if journey_count>=10 and not exists(
    select 1 from public.travel_tokens where user_id=t.owner_id and token_type='ACHIEVEMENT'
      and achievement_code='TEN_TRIPS'
  ) then
    serial_value := nextval('public.travel_token_serial_seq');
    insert into public.travel_tokens(user_id,trip_id,token_type,travel_year,serial_number,achievement_code,rarity)
    values(t.owner_id,t.id,'ACHIEVEMENT',token_year,
      'VOY-10T-'||token_year||'-'||lpad(serial_value::text,6,'0'),'TEN_TRIPS','EPIC');
  end if;
  if city_count>=25 and not exists(
    select 1 from public.travel_tokens where user_id=t.owner_id and token_type='ACHIEVEMENT'
      and achievement_code='TWENTY_FIVE_CITIES'
  ) then
    serial_value := nextval('public.travel_token_serial_seq');
    insert into public.travel_tokens(user_id,trip_id,token_type,travel_year,serial_number,achievement_code,rarity)
    values(t.owner_id,t.id,'ACHIEVEMENT',token_year,
      'VOY-25C-'||token_year||'-'||lpad(serial_value::text,6,'0'),'TWENTY_FIVE_CITIES','EPIC');
  end if;
end;
$$;

create function public.complete_trip(target_trip uuid) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare t public.trips; completed timestamptz;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  select * into t from public.trips where id=target_trip and owner_id=auth.uid() for update;
  if t.id is null then raise exception 'TRIP_NOT_FOUND'; end if;
  if t.end_date>current_date then raise exception 'TRIP_HAS_NOT_ENDED'; end if;
  if jsonb_typeof(coalesce(t.data->'activities','[]'::jsonb))<>'array'
     or jsonb_array_length(coalesce(t.data->'activities','[]'::jsonb))=0 then
    raise exception 'TRIP_ACTIVITY_REQUIRED';
  end if;
  completed := coalesce(t.completed_at,now());
  update public.trips set
    completion_status='COMPLETED', completion_requested_at=coalesce(completion_requested_at,now()),
    completed_at=completed, data=jsonb_set(data,'{status}','"Concluída"'::jsonb,true)
  where id=t.id;
  perform public.issue_trip_tokens(t.id);
  return completed;
end;
$$;
revoke all on function public.complete_trip(uuid) from public,anon;
grant execute on function public.complete_trip(uuid) to authenticated;
revoke all on function public.issue_trip_tokens(uuid) from public,anon,authenticated;
grant execute on function public.issue_trip_tokens(uuid) to service_role;

create function public.protect_trip_completion() returns trigger
language plpgsql set search_path='' as $$
begin
  if current_user='authenticated' and (
    new.completion_status is distinct from old.completion_status or
    new.completion_requested_at is distinct from old.completion_requested_at or
    new.completed_at is distinct from old.completed_at
  ) then raise exception 'SERVER_COMPLETION_REQUIRED'; end if;
  return new;
end;
$$;
revoke all on function public.protect_trip_completion() from public,anon,authenticated;
create trigger protect_trip_completion before update on public.trips
for each row execute function public.protect_trip_completion();

create table public.account_deletion_jobs (
  user_id uuid primary key,
  status text not null default 'PENDING' check(status in ('PENDING','RUNNING','FAILED','COMPLETE')),
  attempts integer not null default 0,
  storage_paths jsonb not null default '{}'::jsonb,
  stripe_customer_id text,
  last_error_code text,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index account_deletion_retry_idx on public.account_deletion_jobs(status,updated_at);
alter table public.account_deletion_jobs enable row level security;
revoke all on public.account_deletion_jobs from public,anon,authenticated;
grant all on public.account_deletion_jobs to service_role;

create table public.exchange_rates (
  base_currency char(3) not null,
  quote_currency char(3) not null,
  rate numeric(18,8) not null check(rate>0),
  provider text not null,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  primary key(base_currency,quote_currency)
);
alter table public.exchange_rates enable row level security;
revoke all on public.exchange_rates from public,anon,authenticated;
grant all on public.exchange_rates to service_role;

alter table public.price_alerts
  add constraint price_alert_origin_length check(char_length(trim(origin)) between 2 and 120),
  add constraint price_alert_destination_length check(char_length(trim(destination)) between 2 and 120),
  add constraint price_alert_currency_format check(currency ~ '^[A-Z]{3}$');

create table public.price_alert_matches (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.price_alerts(id) on delete cascade,
  snapshot_id bigint not null references public.price_snapshots(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  matched_price numeric(14,2) not null check(matched_price>=0),
  email_status text not null default 'NOT_REQUESTED'
    check(email_status in ('NOT_REQUESTED','NOT_CONFIGURED','SENT','FAILED')),
  created_at timestamptz not null default now(),
  unique(alert_id,snapshot_id)
);
create index price_alert_matches_user_idx on public.price_alert_matches(user_id,created_at desc);
alter table public.price_alert_matches enable row level security;
revoke all on public.price_alert_matches from public,anon,authenticated;
grant all on public.price_alert_matches to service_role;

create function public.process_price_alert_match(target_alert uuid,target_snapshot bigint)
returns boolean language plpgsql security definer set search_path='' as $$
declare
  alert public.price_alerts;
  snapshot public.price_snapshots;
  inserted uuid;
begin
  select * into alert from public.price_alerts where id=target_alert for update;
  select * into snapshot from public.price_snapshots where id=target_snapshot;
  if alert.id is null or snapshot.id is null or not alert.active then return false; end if;
  if alert.user_id<>snapshot.user_id or alert.currency<>snapshot.currency
    or lower(trim(alert.origin))<>lower(trim(snapshot.origin))
    or lower(trim(alert.destination))<>lower(trim(snapshot.destination))
    or snapshot.price_type<>'LIVE' or snapshot.total_price>alert.target_price
    or (alert.start_date is not null and alert.start_date is distinct from snapshot.start_date)
    or (alert.end_date is not null and alert.end_date is distinct from snapshot.end_date)
    or alert.last_notified_at>now()-interval '24 hours' then return false; end if;

  insert into public.price_alert_matches(alert_id,snapshot_id,user_id,matched_price)
  values(alert.id,snapshot.id,alert.user_id,snapshot.total_price)
  on conflict(alert_id,snapshot_id) do nothing returning id into inserted;
  if inserted is null then return false; end if;

  insert into public.notifications(user_id,title,body)
  values(
    alert.user_id,
    'Preço encontrado para '||alert.destination,
    'Uma oferta ao vivo de '||snapshot.origin||' para '||snapshot.destination||
      ' chegou a '||snapshot.currency||' '||to_char(snapshot.total_price,'FM999999990D00')||'.'
  );
  update public.price_alerts set last_notified_at=now() where id=alert.id;
  return true;
end;
$$;
revoke all on function public.process_price_alert_match(uuid,bigint) from public,anon,authenticated;
grant execute on function public.process_price_alert_match(uuid,bigint) to service_role;

create function public.process_due_price_alerts(maximum_matches integer default 100)
returns table(alert_id uuid,user_id uuid,snapshot_id bigint,destination text,matched_price numeric,currency text)
language plpgsql security definer set search_path='' as $$
declare candidate record;
begin
  for candidate in
    select a.id as alert_id,a.user_id,s.id as snapshot_id,a.destination,
      s.total_price as matched_price,s.currency
    from public.price_alerts a
    join lateral (
      select ps.* from public.price_snapshots ps
      where ps.user_id=a.user_id and ps.price_type='LIVE'
        and lower(trim(ps.origin))=lower(trim(a.origin))
        and lower(trim(ps.destination))=lower(trim(a.destination))
        and ps.currency=a.currency and ps.total_price<=a.target_price
        and (a.start_date is null or ps.start_date=a.start_date)
        and (a.end_date is null or ps.end_date=a.end_date)
      order by ps.observed_at desc limit 1
    ) s on true
    where a.active and (a.last_notified_at is null or a.last_notified_at<=now()-interval '24 hours')
    order by a.updated_at
    limit least(greatest(maximum_matches,1),500)
  loop
    if public.process_price_alert_match(candidate.alert_id,candidate.snapshot_id) then
      alert_id:=candidate.alert_id;
      user_id:=candidate.user_id;
      snapshot_id:=candidate.snapshot_id;
      destination:=candidate.destination;
      matched_price:=candidate.matched_price;
      currency:=candidate.currency;
      return next;
    end if;
  end loop;
end;
$$;
revoke all on function public.process_due_price_alerts(integer) from public,anon,authenticated;
grant execute on function public.process_due_price_alerts(integer) to service_role;

alter table public.partner_referrals drop constraint partner_referrals_status_check;
update public.partner_referrals set status=case status
  when 'BOOKED' then 'PENDING'
  when 'CANCELLED' then 'REJECTED'
  when 'PAID' then 'COMMISSIONED'
  else status end;
alter table public.partner_referrals
  add constraint partner_referrals_status_check
  check(status in ('CLICKED','PENDING','CONFIRMED','REJECTED','COMMISSIONED'));

notify pgrst,'reload schema';
commit;

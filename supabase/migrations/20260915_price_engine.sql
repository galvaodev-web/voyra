-- Voyra Price Engine, persisted searches, alerts and analytics.
-- Apply after 20260912_marketplace.sql.
begin;

create table public.travel_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  origin text not null check (char_length(origin) between 2 and 120),
  destination text,
  start_date date,
  end_date date,
  flexible_days smallint not null default 0 check (flexible_days between 0 and 30),
  travelers smallint not null check (travelers between 1 and 20),
  duration_days smallint not null check (duration_days between 1 and 90),
  max_budget numeric(14,2) not null check (max_budget > 0),
  currency char(3) not null default 'BRL',
  category text,
  sort_mode text not null check (sort_mode in ('TOTAL_PRICE','PRICE_PER_PERSON','VALUE','FLIGHT_PRICE','HOTEL_PRICE','POPULARITY','VOYRA_AI')),
  status text not null default 'COMPLETED' check (status in ('PENDING','COMPLETED','PARTIAL','FAILED')),
  result_count integer not null default 0 check (result_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index travel_searches_user_created_idx on public.travel_searches(user_id,created_at desc,id desc);
create index travel_searches_route_idx on public.travel_searches(origin,destination,created_at desc);

create table public.search_preferences (
  search_id uuid primary key references public.travel_searches(id) on delete cascade,
  travel_month smallint check (travel_month between 1 and 12),
  region text,
  preferences text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.provider_results (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.travel_searches(id) on delete cascade,
  provider text not null check (char_length(provider) between 2 and 80),
  vertical text not null check (vertical in ('PACKAGE','FLIGHT','HOTEL','ACTIVITY','CAR_RENTAL','INSURANCE','WEATHER','EXCHANGE_RATE')),
  status text not null check (status in ('SUCCESS','DEGRADED','UNAVAILABLE')),
  latency_ms integer not null check (latency_ms >= 0),
  result_count integer not null default 0 check (result_count >= 0),
  error_code text,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz
);
create index provider_results_search_idx on public.provider_results(search_id,fetched_at desc);
create index provider_results_health_idx on public.provider_results(provider,status,fetched_at desc);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.travel_searches(id) on delete cascade,
  provider_result_id uuid references public.provider_results(id) on delete set null,
  provider text not null,
  external_offer_id text not null,
  vertical text not null check (vertical in ('PACKAGE','FLIGHT','HOTEL','ACTIVITY','CAR_RENTAL','INSURANCE')),
  destination_id text not null,
  total_price numeric(14,2) not null check (total_price >= 0),
  currency char(3) not null,
  price_type text not null default 'LIVE' check (price_type = 'LIVE'),
  affiliate_url text,
  tracking_id text,
  commission_model text,
  observed_at timestamptz not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider,external_offer_id,observed_at)
);
create index offers_search_price_idx on public.offers(search_id,total_price,id);
create index offers_expiry_idx on public.offers(expires_at) where expires_at is not null;

create table public.price_snapshots (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  search_id uuid references public.travel_searches(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  provider text not null,
  origin text not null,
  destination text not null,
  start_date date,
  end_date date,
  travelers smallint not null check (travelers between 1 and 20),
  total_price numeric(14,2) not null check (total_price >= 0),
  currency char(3) not null,
  price_type text not null check (price_type = 'LIVE'),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index price_snapshots_route_time_idx on public.price_snapshots(origin,destination,observed_at desc);
create index price_snapshots_user_time_idx on public.price_snapshots(user_id,observed_at desc);

create table public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  origin text not null,
  destination text not null,
  target_price numeric(14,2) not null check (target_price > 0),
  currency char(3) not null default 'BRL',
  start_date date,
  end_date date,
  active boolean not null default true,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index price_alerts_active_idx on public.price_alerts(active,created_at) where active;
create index price_alerts_user_idx on public.price_alerts(user_id,created_at desc);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  price_alert_email boolean not null default true,
  price_alert_push boolean not null default false,
  marketing_email boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null check (name in ('user_signed_up','trip_created','trip_completed','search_created','destination_viewed','offer_viewed','offer_clicked','booking_redirect','conversion','route_generated','post_imported_to_trip','trip_shared_to_social','subscription_started','subscription_cancelled')),
  search_id uuid references public.travel_searches(id) on delete set null,
  trip_id uuid references public.trips(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  campaign text,
  anonymous_id text,
  consented boolean not null default false,
  properties jsonb not null default '{}'::jsonb check (jsonb_typeof(properties) = 'object'),
  occurred_at timestamptz not null default now()
);
create index analytics_events_name_time_idx on public.analytics_events(name,occurred_at desc);
create index analytics_events_user_time_idx on public.analytics_events(user_id,occurred_at desc);

create table public.provider_health (
  provider text primary key,
  status text not null check (status in ('HEALTHY','DEGRADED','UNAVAILABLE')),
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  last_latency_ms integer,
  checked_at timestamptz not null default now()
);

create table public.api_rate_limits (
  scope text not null,
  identifier_hash text not null,
  window_started_at timestamptz not null,
  hits integer not null check (hits > 0),
  primary key(scope,identifier_hash)
);

create function public.consume_rate_limit(
  target_scope text,
  target_identifier_hash text,
  maximum_hits integer,
  window_seconds integer
) returns boolean
language plpgsql security invoker set search_path='' as $$
declare allowed boolean;
begin
  if maximum_hits < 1 or window_seconds < 1 then return false; end if;
  insert into public.api_rate_limits(scope,identifier_hash,window_started_at,hits)
  values(target_scope,target_identifier_hash,now(),1)
  on conflict(scope,identifier_hash) do update set
    window_started_at=case
      when public.api_rate_limits.window_started_at <= now()-make_interval(secs => window_seconds)
      then now() else public.api_rate_limits.window_started_at end,
    hits=case
      when public.api_rate_limits.window_started_at <= now()-make_interval(secs => window_seconds)
      then 1 else public.api_rate_limits.hits+1 end
  returning hits <= maximum_hits into allowed;
  return allowed;
end;
$$;

create function public.persist_travel_search(
  account uuid,
  search_identifier uuid,
  search_payload jsonb,
  provider_payload jsonb,
  offer_payload jsonb
) returns uuid
language plpgsql security invoker set search_path='' as $$
declare provider_item jsonb; offer_item jsonb; saved_offer uuid;
begin
  if account is null or not exists(select 1 from public.profiles where id=account) then
    raise exception 'Invalid search owner';
  end if;
  if jsonb_typeof(search_payload) <> 'object'
    or jsonb_typeof(provider_payload) <> 'array'
    or jsonb_typeof(offer_payload) <> 'array' then
    raise exception 'Invalid search payload';
  end if;

  insert into public.travel_searches(
    id,user_id,origin,destination,start_date,end_date,flexible_days,travelers,
    duration_days,max_budget,currency,category,sort_mode,status,result_count
  ) values (
    search_identifier,account,search_payload->>'origin',nullif(search_payload->>'destination',''),
    nullif(search_payload->>'startDate','')::date,nullif(search_payload->>'endDate','')::date,
    coalesce((search_payload->>'flexibleDays')::smallint,0),(search_payload->>'travelers')::smallint,
    (search_payload->>'durationDays')::smallint,(search_payload->>'maxBudget')::numeric,
    search_payload->>'currency',nullif(search_payload->>'category',''),search_payload->>'sort',
    search_payload->>'status',(search_payload->>'resultCount')::integer
  );

  insert into public.search_preferences(search_id,travel_month,region,preferences)
  values(
    search_identifier,nullif(search_payload->>'month','')::smallint,
    nullif(search_payload->>'region',''),
    coalesce(array(select jsonb_array_elements_text(search_payload->'preferences')),'{}')
  );

  for provider_item in select * from jsonb_array_elements(provider_payload) loop
    insert into public.provider_results(search_id,provider,vertical,status,latency_ms,result_count,error_code)
    values(
      search_identifier,provider_item->>'provider',provider_item->>'kind',provider_item->>'status',
      (provider_item->>'latencyMs')::integer,jsonb_array_length(provider_item->'offers'),
      nullif(provider_item->>'errorCode','')
    );
  end loop;

  for offer_item in select * from jsonb_array_elements(offer_payload) loop
    insert into public.offers(
      search_id,provider,external_offer_id,vertical,destination_id,total_price,currency,
      affiliate_url,commission_model,observed_at,expires_at
    ) values (
      search_identifier,offer_item->>'provider',offer_item->>'externalId',offer_item->>'kind',
      offer_item->>'destinationId',(offer_item->>'amount')::numeric,offer_item->>'currency',
      nullif(offer_item->>'affiliateUrl',''),nullif(offer_item->>'commissionModel',''),
      (offer_item->>'observedAt')::timestamptz,nullif(offer_item->>'expiresAt','')::timestamptz
    ) returning id into saved_offer;

    insert into public.price_snapshots(
      user_id,search_id,offer_id,provider,origin,destination,start_date,end_date,travelers,
      total_price,currency,price_type,confidence,observed_at
    ) values (
      account,search_identifier,saved_offer,offer_item->>'provider',search_payload->>'origin',
      offer_item->>'destinationId',nullif(search_payload->>'startDate','')::date,
      nullif(search_payload->>'endDate','')::date,(search_payload->>'travelers')::smallint,
      (offer_item->>'amount')::numeric,offer_item->>'currency','LIVE',0.9,
      (offer_item->>'observedAt')::timestamptz
    );
  end loop;

  return search_identifier;
end;
$$;

alter table public.partner_referrals
  add column search_id uuid references public.travel_searches(id) on delete set null,
  add column trip_id uuid references public.trips(id) on delete set null,
  add column campaign text;
create index partner_referrals_search_idx on public.partner_referrals(search_id,created_at desc);

alter table public.travel_searches enable row level security;
alter table public.search_preferences enable row level security;
alter table public.provider_results enable row level security;
alter table public.offers enable row level security;
alter table public.price_snapshots enable row level security;
alter table public.price_alerts enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.analytics_events enable row level security;
alter table public.provider_health enable row level security;
alter table public.api_rate_limits enable row level security;

create policy travel_searches_owner on public.travel_searches for select to authenticated
using(user_id=(select auth.uid()));
create policy search_preferences_owner on public.search_preferences for select to authenticated
using(exists(select 1 from public.travel_searches s where s.id=search_id and s.user_id=(select auth.uid())));
create policy provider_results_owner on public.provider_results for select to authenticated
using(exists(select 1 from public.travel_searches s where s.id=search_id and s.user_id=(select auth.uid())));
create policy offers_owner on public.offers for select to authenticated
using(exists(select 1 from public.travel_searches s where s.id=search_id and s.user_id=(select auth.uid())));
create policy price_snapshots_owner on public.price_snapshots for select to authenticated
using(user_id=(select auth.uid()));
create policy price_alerts_owner on public.price_alerts for all to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy notification_preferences_owner on public.notification_preferences for all to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

revoke all on public.travel_searches,public.search_preferences,public.provider_results,public.offers,
  public.price_snapshots,public.price_alerts,public.notification_preferences,public.analytics_events,
  public.provider_health,public.api_rate_limits from anon,authenticated;
grant select on public.travel_searches,public.search_preferences,public.provider_results,public.offers,
  public.price_snapshots to authenticated;
grant select,insert,update,delete on public.price_alerts,public.notification_preferences to authenticated;
grant all on public.travel_searches,public.search_preferences,public.provider_results,public.offers,
  public.price_snapshots,public.price_alerts,public.notification_preferences,public.analytics_events,
  public.provider_health,public.api_rate_limits to service_role;
grant select on public.profiles,public.trips to service_role;
revoke all on function public.consume_rate_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,text,integer,integer) to service_role;
revoke all on function public.persist_travel_search(uuid,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.persist_travel_search(uuid,uuid,jsonb,jsonb,jsonb) to service_role;

create trigger touch_travel_search before update on public.travel_searches
for each row execute function public.touch_updated_at();
create trigger touch_price_alert before update on public.price_alerts
for each row execute function public.touch_updated_at();
create trigger touch_notification_preferences before update on public.notification_preferences
for each row execute function public.touch_updated_at();

commit;

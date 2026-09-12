-- Voyra v1. Run once in the SQL editor of a new Supabase project.
begin;
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Viajante',
  city text not null default '',
  avatar_url text,
  saved_routes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 200),
  destination text not null,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  budget numeric(14,2) not null default 0 check (budget >= 0),
  -- The application persists one atomic aggregate per trip in v1.
  -- Relational child tables below are ready for granular collaboration in v2.
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trips_owner_idx on public.trips(owner_id);

create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text,
  role text not null default 'participant' check (role in ('admin','participant')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, user_id), unique (id, trip_id)
);
create table public.trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_number integer not null check (day_number > 0),
  date date not null,
  city text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(trip_id,day_number), unique(id,trip_id)
);
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_id uuid,
  name text not null,
  category text not null,
  starts_at time not null,
  duration_minutes integer check(duration_minutes > 0),
  estimated_cost numeric(14,2) default 0 check(estimated_cost >= 0),
  location text,
  latitude numeric(10,7), longitude numeric(10,7), image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(day_id,trip_id) references public.trip_days(id,trip_id) on delete cascade
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  paid_by uuid,
  description text not null,
  amount numeric(14,2) not null check(amount > 0),
  currency char(3) not null default 'BRL',
  category text not null,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(paid_by,trip_id) references public.trip_members(id,trip_id)
);
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  type text not null,
  date date,
  time time,
  reference text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,trip_id)
);
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  document_id uuid,
  provider text not null,
  type text not null,
  reference text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(document_id,trip_id) references public.documents(id,trip_id)
);
create table public.trip_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  text text not null,
  date date not null,
  location text,
  rating integer check(rating between 1 and 5),
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  destination_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,destination_id)
);
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  provider text not null default 'mock',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,name)
  values(new.id,coalesce(nullif(new.raw_user_meta_data->>'name',''),'Viajante'));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
-- Also support users created before running this schema.
insert into public.profiles(id,name)
select id,coalesce(nullif(raw_user_meta_data->>'name',''),'Viajante') from auth.users
on conflict(id) do nothing;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;

create policy profiles_own_select on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profiles_own_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy trips_owner on public.trips for all to authenticated
using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy favorites_owner on public.favorites for all to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy notifications_read on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

do $$
declare table_name text;
begin
  foreach table_name in array array['trip_members','trip_days','activities','expenses','documents','bookings','trip_notes','ai_conversations'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('create index %I on public.%I(trip_id)',table_name||'_trip_idx',table_name);
    execute format('create policy trip_owner on public.%I for all to authenticated using (exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select auth.uid()))) with check (exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select auth.uid())))',table_name);
  end loop;
  foreach table_name in array array['profiles','trips','trip_members','trip_days','activities','expenses','documents','bookings','trip_notes','favorites','ai_conversations','notifications'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.touch_updated_at()',table_name);
  end loop;
end $$;

-- Atomic preference update, subject to the caller's RLS policies.
create function public.save_preferences(profile_name text,profile_city text,route_ids text[],destination_ids text[])
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(trim(profile_name)) < 2 then raise exception 'Invalid name'; end if;
  update public.profiles set name=trim(profile_name),city=profile_city,saved_routes=route_ids where id=auth.uid();
  delete from public.favorites where user_id=auth.uid();
  insert into public.favorites(user_id,destination_id)
  select auth.uid(),v from (select distinct unnest(destination_ids) as v) d;
end;
$$;
revoke all on function public.save_preferences(text,text,text[],text[]) from public,anon;
grant execute on function public.save_preferences(text,text,text[],text[]) to authenticated;
revoke all on function public.handle_new_user() from public,anon,authenticated;

grant usage on schema public to authenticated;
grant select,insert,update,delete on public.trips,public.trip_members,public.trip_days,public.activities,public.expenses,public.documents,public.bookings,public.trip_notes,public.favorites,public.ai_conversations to authenticated;
grant select,update on public.profiles,public.notifications to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('travel-documents','travel-documents',false,3145728,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy documents_private_select on storage.objects for select to authenticated
using(bucket_id='travel-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy documents_private_insert on storage.objects for insert to authenticated
with check(bucket_id='travel-documents' and (storage.foldername(name))[1]=(select auth.uid())::text
and exists(select 1 from public.trips t where t.id::text=(storage.foldername(storage.objects.name))[2] and t.owner_id=(select auth.uid())));
create policy documents_private_delete on storage.objects for delete to authenticated
using(bucket_id='travel-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;

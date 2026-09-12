-- Voyra intermediation ledger. Apply after 20260911_launch.sql.
begin;

create table public.partner_referrals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  partner text not null check (partner in ('skyscanner')),
  vertical text not null check (vertical in ('flights','hotels','cars','experiences')),
  subid text not null unique check (char_length(subid) between 8 and 255),
  search jsonb not null default '{}'::jsonb,
  status text not null default 'CLICKED' check (status in ('CLICKED','BOOKED','CONFIRMED','CANCELLED','PAID')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partner_referrals_user_idx on public.partner_referrals(user_id,created_at desc);
create index partner_referrals_partner_idx on public.partner_referrals(partner,created_at desc);
alter table public.partner_referrals enable row level security;
revoke all on public.partner_referrals from anon,authenticated;
grant all on public.partner_referrals to service_role;

create table public.commission_events (
  id text primary key,
  referral_id uuid references public.partner_referrals(id) on delete set null,
  partner text not null check (partner in ('skyscanner')),
  booking_reference text,
  gross_amount numeric(14,2),
  currency text not null default 'BRL' check (char_length(currency)=3),
  commission_amount numeric(14,2) not null check (commission_amount>=0),
  status text not null check (status in ('PENDING','APPROVED','REVERSED','PAID')),
  occurred_at timestamptz not null default now(),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index commission_events_referral_idx on public.commission_events(referral_id);
create index commission_events_status_idx on public.commission_events(status,occurred_at desc);
alter table public.commission_events enable row level security;
revoke all on public.commission_events from anon,authenticated;
grant all on public.commission_events to service_role;

create function public.touch_partner_referral() returns trigger
language plpgsql set search_path='' as $$
begin
  new.updated_at=now();
  return new;
end;
$$;
revoke all on function public.touch_partner_referral() from public,anon,authenticated;
create trigger touch_partner_referral before update on public.partner_referrals
for each row execute function public.touch_partner_referral();

commit;

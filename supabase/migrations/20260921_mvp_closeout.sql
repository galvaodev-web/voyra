-- Voyra MVP closeout: let owners export their own route snapshots, including withdrawn ones.
begin;

create policy published_routes_owner_read on public.published_routes
for select to authenticated
using(owner_id=(select auth.uid()));

notify pgrst,'reload schema';
commit;

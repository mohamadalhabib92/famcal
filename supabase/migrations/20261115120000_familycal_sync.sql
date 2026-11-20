-- Familycal — agenda familial, Postgres + RLS + Realtime.
-- Ne pas appliquer ce fichier à un projet Supabase hébergé sans l'accord du propriétaire.
-- Aucun projet n'est créé ici : le plan gratuit est déjà plein, et l'app reste hors ligne
-- tant que EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY ne sont pas renseignés.
--
-- Matrice (le test src/sync/sync.test.ts relit ces lignes) :
-- rls-case no-viewer read=deny write=deny
-- rls-case family-adult read=allow write=deny
-- rls-case family-minor-masked read=allow write=deny
-- rls-case family-guardian-detail read=allow write=allow
-- rls-case family-tuteur read=allow write=allow
-- rls-case private-creator read=allow write=allow
-- rls-case private-assignee read=allow write=deny
-- rls-case private-stranger read=deny write=deny
-- rls-case private-tuteur-adult read=deny write=deny
-- rls-case private-child-tuteur read=allow write=allow
-- rls-case private-child-parent read=allow write=allow
-- rls-case private-child-other-parent read=deny write=deny
-- rls-case private-child-self read=allow write=allow
-- rls-case private-child-other read=deny write=deny
-- rls-case selected-listed read=allow write=deny
-- rls-case selected-unlisted read=deny write=deny
-- rls-case selected-child-blocked read=deny write=deny
-- rls-case family-child-sees read=allow write=deny
-- rls-case family-child-mask read=allow write=deny
-- rls-case child-cannot-write-family read=allow write=deny

create table if not exists public.families (
  id text primary key,
  name text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  doc jsonb not null
);

create table if not exists public.members (
  id text primary key,
  family_id text not null references public.families (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  color text not null,
  role text not null check (role in ('tuteur', 'parent', 'membre', 'enfant')),
  managed boolean not null default false,
  kind text check (kind in ('enfant', 'dependant')),
  birth_year int,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  doc jsonb not null
);

create table if not exists public.guardian_links (
  id text primary key,
  family_id text not null references public.families (id) on delete cascade,
  guardian_id text not null,
  ward_id text not null,
  consent_share boolean not null default false,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  doc jsonb not null
);

create table if not exists public.events (
  id text primary key,
  family_id text not null references public.families (id) on delete cascade,
  visibility text not null default 'family' check (visibility in ('family', 'selected', 'private')),
  created_by text not null,
  member_ids text[] not null default '{}',
  visible_member_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  doc jsonb not null
);

create table if not exists public.invites (
  code text primary key,
  family_id text not null references public.families (id) on delete cascade,
  role text not null check (role in ('tuteur', 'parent', 'membre', 'enfant')),
  created_by text not null,
  expires_at timestamptz not null,
  accepted_by text,
  revoked boolean not null default false,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  doc jsonb not null
);

create table if not exists public.revisions (
  id text primary key,
  family_id text not null,
  entity text not null,
  entity_id text not null,
  updated_at timestamptz not null,
  doc jsonb not null,
  reason text not null check (reason in ('older-writer', 'tie-keep-current'))
);

create index if not exists events_family_idx on public.events (family_id, updated_at);
create index if not exists members_family_idx on public.members (family_id, user_id);
create index if not exists revisions_family_idx on public.revisions (family_id, entity, entity_id);

alter table public.families enable row level security;
alter table public.families force row level security;
alter table public.members enable row level security;
alter table public.members force row level security;
alter table public.guardian_links enable row level security;
alter table public.guardian_links force row level security;
alter table public.events enable row level security;
alter table public.events force row level security;
alter table public.invites enable row level security;
alter table public.invites force row level security;
alter table public.revisions enable row level security;
alter table public.revisions force row level security;

create or replace function public.member_is_minor(managed boolean, kind text, birth_year int)
returns boolean
language sql
immutable
as $$
  select coalesce(managed, false)
    and kind = 'enfant'
    and (birth_year is null or extract(year from now())::int - birth_year < 18);
$$;

create or replace function public.shares_family(fid text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where m.family_id = fid
      and m.user_id = auth.uid()
      and m.deleted_at is null
  );
$$;

create or replace function public.guards_event_minor(v public.members, ev public.events)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.family_id = ev.family_id
      and m.deleted_at is null
      and (m.id = ev.created_by or m.id = any (ev.member_ids))
      and public.member_is_minor(m.managed, m.kind, m.birth_year)
      and (
        v.role = 'tuteur'
        or exists (
          select 1 from public.guardian_links g
          where g.family_id = ev.family_id
            and g.ward_id = m.id
            and g.guardian_id = v.id
            and g.deleted_at is null
        )
      )
  );
$$;

create or replace function public.can_select_event(ev public.events)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v public.members%rowtype;
  audience text;
  own boolean;
  listed boolean;
  guardian boolean;
  child_viewer boolean;
begin
  select * into v
  from public.members
  where family_id = ev.family_id
    and user_id = auth.uid()
    and deleted_at is null
  limit 1;
  if v.id is null then
    return false;
  end if;
  audience := coalesce(ev.visibility, 'family');
  own := ev.created_by = v.id or v.id = any (ev.member_ids);
  listed := own or v.id = any (ev.visible_member_ids);
  guardian := public.guards_event_minor(v, ev);
  child_viewer := v.role = 'enfant' or public.member_is_minor(v.managed, v.kind, v.birth_year);
  if child_viewer then
    return audience = 'family' or own or guardian;
  end if;
  if own or guardian then
    return true;
  end if;
  if audience = 'family' then
    return true;
  end if;
  if audience = 'selected' and listed then
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.can_see_event_detail(ev public.events)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v public.members%rowtype;
  own boolean;
  guardian boolean;
begin
  if not public.can_select_event(ev) then
    return false;
  end if;
  select * into v
  from public.members
  where family_id = ev.family_id and user_id = auth.uid() and deleted_at is null
  limit 1;
  own := ev.created_by = v.id or v.id = any (ev.member_ids);
  guardian := public.guards_event_minor(v, ev);
  if v.role = 'tuteur' or own or guardian then
    return true;
  end if;
  return not exists (
    select 1
    from public.members m
    where m.family_id = ev.family_id
      and m.deleted_at is null
      and m.id = any (ev.member_ids)
      and public.member_is_minor(m.managed, m.kind, m.birth_year)
      and not exists (
        select 1 from public.guardian_links g
        where g.ward_id = m.id and g.guardian_id = v.id and g.deleted_at is null and g.consent_share
      )
      and not (
        (select count(*) from public.guardian_links g where g.ward_id = m.id and g.deleted_at is null) > 0
        and not exists (
          select 1 from public.guardian_links g
          where g.ward_id = m.id and g.deleted_at is null and g.consent_share = false
        )
      )
  );
end;
$$;

create or replace function public.can_write_event(ev public.events)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v public.members%rowtype;
  child_viewer boolean;
begin
  if not public.can_see_event_detail(ev) then
    return false;
  end if;
  select * into v
  from public.members
  where family_id = ev.family_id and user_id = auth.uid() and deleted_at is null
  limit 1;
  if v.role = 'tuteur' then
    return true;
  end if;
  if ev.created_by = v.id then
    return true;
  end if;
  child_viewer := v.role = 'enfant' or public.member_is_minor(v.managed, v.kind, v.birth_year);
  if cardinality(ev.member_ids) = 0 then
    return false;
  end if;
  if child_viewer then
    return not exists (select 1 from unnest(ev.member_ids) mid where mid <> v.id);
  end if;
  return not exists (
    select 1
    from unnest(ev.member_ids) mid
    where mid <> v.id
      and not exists (
        select 1 from public.guardian_links g
        where g.guardian_id = v.id and g.ward_id = mid and g.deleted_at is null
      )
  );
end;
$$;

create or replace function public.keep_losing_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  entity_name text := tg_argv[0];
  family text;
  entity_key text;
begin
  if tg_op = 'INSERT' then
    return new;
  end if;
  family := case when entity_name = 'family' then old.id else old.family_id end;
  entity_key := case when entity_name = 'invite' then old.code else old.id end;
  if new.updated_at > old.updated_at then
    insert into public.revisions (id, family_id, entity, entity_id, updated_at, doc, reason)
    values (gen_random_uuid()::text, family, entity_name, entity_key, old.updated_at, old.doc, 'older-writer');
    return new;
  end if;
  if new.doc is distinct from old.doc or new.deleted_at is distinct from old.deleted_at then
    insert into public.revisions (id, family_id, entity, entity_id, updated_at, doc, reason)
    values (
      gen_random_uuid()::text,
      family,
      entity_name,
      entity_key,
      new.updated_at,
      new.doc,
      case when new.updated_at < old.updated_at then 'older-writer' else 'tie-keep-current' end
    );
  end if;
  return old;
end;
$$;

drop trigger if exists families_lww on public.families;
create trigger families_lww before update on public.families
for each row execute function public.keep_losing_write('family');

drop trigger if exists members_lww on public.members;
create trigger members_lww before update on public.members
for each row execute function public.keep_losing_write('member');

drop trigger if exists links_lww on public.guardian_links;
create trigger links_lww before update on public.guardian_links
for each row execute function public.keep_losing_write('link');

drop trigger if exists events_lww on public.events;
create trigger events_lww before update on public.events
for each row execute function public.keep_losing_write('event');

drop trigger if exists invites_lww on public.invites;
create trigger invites_lww before update on public.invites
for each row execute function public.keep_losing_write('invite');

create or replace function public.create_household(
  p_family_id text,
  p_family_name text,
  p_member_id text,
  p_member_name text,
  p_color text,
  p_family_doc jsonb,
  p_member_doc jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;
  if exists (select 1 from public.families where id = p_family_id) then
    if exists (
      select 1 from public.members
      where family_id = p_family_id and user_id = auth.uid() and deleted_at is null
    ) then
      return;
    end if;
    raise exception 'family exists';
  end if;
  insert into public.families (id, name, updated_at, doc)
  values (p_family_id, p_family_name, now(), p_family_doc);
  insert into public.members (id, family_id, user_id, name, color, role, managed, updated_at, doc)
  values (p_member_id, p_family_id, auth.uid(), p_member_name, p_color, 'tuteur', false, now(), p_member_doc);
end;
$$;

create or replace function public.accept_invite(
  p_code text,
  p_member_id text,
  p_name text,
  p_color text,
  p_doc jsonb
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;
  select * into inv from public.invites where code = p_code;
  if inv.code is null or inv.revoked or inv.accepted_by is not null or inv.expires_at < now() then
    raise exception 'invite unavailable';
  end if;
  insert into public.members (id, family_id, user_id, name, color, role, managed, updated_at, doc)
  values (p_member_id, inv.family_id, auth.uid(), p_name, p_color, inv.role, inv.role = 'enfant', now(), p_doc);
  update public.invites
  set accepted_by = p_member_id, updated_at = now(), doc = doc || jsonb_build_object('acceptedBy', p_member_id)
  where code = p_code;
  return inv.family_id;
end;
$$;

revoke all on table public.families from anon, public;
revoke all on table public.members from anon, public;
revoke all on table public.guardian_links from anon, public;
revoke all on table public.events from anon, public;
revoke all on table public.invites from anon, public;
revoke all on table public.revisions from anon, public;

grant select, update on table public.families to authenticated;
grant select, insert, update on table public.members to authenticated;
grant select, insert, update on table public.guardian_links to authenticated;
grant select, insert, update on table public.events to authenticated;
grant select, insert, update on table public.invites to authenticated;
grant select on table public.revisions to authenticated;

create or replace view public.events_for_me
with (security_barrier = true) as
select
  e.id,
  e.family_id,
  e.visibility,
  e.updated_at,
  e.deleted_at,
  case
    when public.can_see_event_detail(e) then e.doc
    else (e.doc - 'title' - 'notes' - 'location')
      || jsonb_build_object('title', 'Occupé', 'notes', null, 'location', null)
  end as doc
from public.events e
where public.can_select_event(e);

revoke all on table public.events_for_me from anon, public;
grant select on table public.events_for_me to authenticated;

create policy families_select on public.families
for select to authenticated
using (public.shares_family(id) and deleted_at is null);

create policy families_update on public.families
for update to authenticated
using (public.shares_family(id) and exists (
  select 1 from public.members m
  where m.family_id = families.id and m.user_id = auth.uid() and m.role = 'tuteur' and m.deleted_at is null
))
with check (public.shares_family(id));

create policy members_select on public.members
for select to authenticated
using (public.shares_family(family_id));

create policy members_insert on public.members
for insert to authenticated
with check (
  public.shares_family(family_id)
  and exists (
    select 1 from public.members m
    where m.family_id = members.family_id
      and m.user_id = auth.uid()
      and m.deleted_at is null
      and m.role in ('tuteur', 'parent')
  )
);

create policy members_update on public.members
for update to authenticated
using (public.shares_family(family_id))
with check (public.shares_family(family_id));

create policy links_select on public.guardian_links
for select to authenticated
using (public.shares_family(family_id));

create policy links_write on public.guardian_links
for all to authenticated
using (
  exists (
    select 1 from public.members m
    where m.family_id = guardian_links.family_id
      and m.user_id = auth.uid()
      and m.deleted_at is null
      and m.role in ('tuteur', 'parent')
  )
)
with check (
  exists (
    select 1 from public.members m
    where m.family_id = guardian_links.family_id
      and m.user_id = auth.uid()
      and m.deleted_at is null
      and m.role in ('tuteur', 'parent')
  )
);

create policy events_select on public.events
for select to authenticated
using (public.can_select_event(events));

create policy events_insert on public.events
for insert to authenticated
with check (public.can_write_event(events));

create policy events_update on public.events
for update to authenticated
using (public.can_write_event(events))
with check (public.can_write_event(events));

create policy invites_select on public.invites
for select to authenticated
using (public.shares_family(family_id));

create policy invites_insert on public.invites
for insert to authenticated
with check (
  public.shares_family(family_id)
  and exists (
    select 1 from public.members m
    where m.family_id = invites.family_id
      and m.user_id = auth.uid()
      and m.deleted_at is null
      and (m.role = 'tuteur' or (m.role = 'parent' and invites.role <> 'tuteur'))
  )
);

create policy invites_update on public.invites
for update to authenticated
using (public.shares_family(family_id))
with check (public.shares_family(family_id));

create policy revisions_select on public.revisions
for select to authenticated
using (public.shares_family(family_id));

revoke all on function public.create_household(text, text, text, text, text, jsonb, jsonb) from public, anon;
revoke all on function public.accept_invite(text, text, text, text, jsonb) from public, anon;
revoke all on function public.can_select_event(public.events) from public, anon;
revoke all on function public.can_write_event(public.events) from public, anon;
revoke all on function public.can_see_event_detail(public.events) from public, anon;
grant execute on function public.create_household(text, text, text, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.accept_invite(text, text, text, text, jsonb) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.events;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.members;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.invites;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- 0004: accounts. Link profiles to Supabase Auth users and lock the user tables down with RLS.
--
-- Guests keep working: a profile with user_id NULL is a guest (the rhorverse_pid cookie) and is only
-- reachable through the API. A profile with user_id set belongs to that auth user.
--
-- The API connects as the table owner, so it bypasses RLS and enforces ownership in code (the token's
-- `sub` picks the profile). RLS is the second wall: it is what stops a Supabase client holding the
-- public key from reading or writing someone else's rows. Do not FORCE row level security here.

-- Plain Postgres (local docker) has no Supabase `auth` schema. Create the minimum the policies need
-- there; on Supabase `auth` already exists and this block does nothing.
do $$
begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
    end if;
    if to_regnamespace('auth') is null then
        create schema auth;
        create table auth.users (
            id    uuid primary key,
            email text
        );
        create function auth.uid() returns uuid
            language sql stable
            as $f$
                select coalesce(
                    nullif(current_setting('request.jwt.claim.sub', true), ''),
                    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
                )::uuid
            $f$;
        -- Supabase already grants these; only the stub needs them spelled out.
        grant usage on schema auth to anon, authenticated;
    end if;
end
$$;

alter table profiles
    add column user_id       uuid unique references auth.users (id) on delete cascade,
    add column age_confirmed boolean not null default false,
    add column consent_at    timestamptz;

alter table profiles enable row level security;
alter table events   enable row level security;
alter table imports  enable row level security;

-- The public (anon) key must never see user data. Signed-in users get only what the policies allow.
revoke all on profiles, events, imports from anon;
grant select, insert, update, delete on profiles, events, imports to authenticated;

create policy profiles_own on profiles
    for all to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

create policy events_own on events
    for all to authenticated
    using (exists (select 1 from profiles p where p.id = events.profile_id and p.user_id = (select auth.uid())))
    with check (exists (select 1 from profiles p where p.id = events.profile_id and p.user_id = (select auth.uid())));

create policy imports_own on imports
    for all to authenticated
    using (exists (select 1 from profiles p where p.id = imports.profile_id and p.user_id = (select auth.uid())))
    with check (exists (select 1 from profiles p where p.id = imports.profile_id and p.user_id = (select auth.uid())));

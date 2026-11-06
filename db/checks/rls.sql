-- RLS check for 0004_auth. Everything runs in one transaction and is rolled back, so it leaves nothing
-- behind. Run it against any database that has migration 0004:
--
--   docker exec -i canopy-pg psql -U postgres -d canopy -v ON_ERROR_STOP=1 -X < db/checks/rls.sql
--
-- On Supabase, paste it into the SQL editor (it inserts two throwaway auth.users rows, then rolls back).
-- Expected last line: "rls check passed".
begin;

insert into auth.users (id, email) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@example.test'),
    ('bbbbbbbb-0000-0000-0000-00000000000b', 'b@example.test');

insert into works (id, media, source, source_id, title)
values ('rls:movie/1', 'movie', 'rls', 'movie/1', 'RLS check work');

insert into profiles (id, user_id) values
    ('aaaaaaaa-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-00000000000a'),
    ('bbbbbbbb-1111-1111-1111-111111111111', 'bbbbbbbb-0000-0000-0000-00000000000b'),
    ('cccccccc-1111-1111-1111-111111111111', null);  -- a guest

insert into events (profile_id, work_id, kind) values
    ('aaaaaaaa-1111-1111-1111-111111111111', 'rls:movie/1', 'consumed'),
    ('bbbbbbbb-1111-1111-1111-111111111111', 'rls:movie/1', 'consumed'),
    ('cccccccc-1111-1111-1111-111111111111', 'rls:movie/1', 'like');
insert into imports (profile_id, source) values
    ('aaaaaaaa-1111-1111-1111-111111111111', 'letterboxd'),
    ('bbbbbbbb-1111-1111-1111-111111111111', 'letterboxd');

-- Act as user A, the way a Supabase client with A's access token would.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare n int;
begin
    select count(*) into n from profiles;
    if n <> 1 then raise exception 'A sees % profiles, expected only their own', n; end if;
    select count(*) into n from events;
    if n <> 1 then raise exception 'A sees % events, expected only their own', n; end if;
    select count(*) into n from imports;
    if n <> 1 then raise exception 'A sees % imports, expected only their own', n; end if;
    select count(*) into n from events where profile_id = 'bbbbbbbb-1111-1111-1111-111111111111';
    if n <> 0 then raise exception 'A can read B''s events'; end if;
    select count(*) into n from profiles where user_id is null;
    if n <> 0 then raise exception 'A can read a guest profile'; end if;

    -- Writes against B's rows change nothing.
    update events set kind = 'dislike' where profile_id = 'bbbbbbbb-1111-1111-1111-111111111111';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'A updated % of B''s events', n; end if;
    delete from imports where profile_id = 'bbbbbbbb-1111-1111-1111-111111111111';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'A deleted % of B''s imports', n; end if;

    -- Inserting into B's profile, or claiming B's user_id, is rejected.
    begin
        insert into events (profile_id, work_id, kind) values ('bbbbbbbb-1111-1111-1111-111111111111', 'rls:movie/1', 'like');
        raise exception 'A inserted an event into B''s profile';
    exception when insufficient_privilege then null;
    end;
    begin
        update profiles set user_id = 'bbbbbbbb-0000-0000-0000-00000000000b'
            where id = 'aaaaaaaa-1111-1111-1111-111111111111';
        raise exception 'A re-pointed their profile at B''s user';
    exception when insufficient_privilege then null;
    end;

    -- Their own rows are fully usable.
    insert into events (profile_id, work_id, kind) values ('aaaaaaaa-1111-1111-1111-111111111111', 'rls:movie/1', 'like');
    select count(*) into n from events;
    if n <> 2 then raise exception 'A should now see 2 events, sees %', n; end if;
end
$$;

-- The public (anon) role sees nothing at all.
reset role;
set local role anon;
do $$
begin
    perform 1 from profiles;
    raise exception 'anon could select from profiles';
exception when insufficient_privilege then null;
end
$$;

rollback;
\echo rls check passed

-- 0003: anonymous profiles, interaction events, import jobs
create table profiles (
    id          uuid primary key,               -- rhorverse_pid cookie
    taste       vector(384),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create table events (
    id          bigint generated always as identity primary key,
    profile_id  uuid not null references profiles (id) on delete cascade,
    work_id     text not null references works (id) on delete cascade,
    kind        text not null check (kind in ('view', 'like', 'dislike', 'save', 'consumed', 'skip')),
    weight      real not null default 1,
    source      text not null default 'app',    -- 'app' or an import source
    ts          timestamptz not null default now()
);
create index events_profile_ts on events (profile_id, ts desc);
create index events_profile_kind on events (profile_id, kind);

create table imports (
    id          bigint generated always as identity primary key,
    profile_id  uuid not null references profiles (id) on delete cascade,
    source      text not null check (source in ('netflix', 'letterboxd', 'anilist', 'steam')),
    status      text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
    matched     integer not null default 0,
    unmatched   integer not null default 0,
    error       text,
    created_at  timestamptz not null default now(),
    finished_at timestamptz
);

-- 0001: extensions + core catalogue tables
create extension if not exists vector;
create extension if not exists pg_trgm;

create type media_type as enum ('movie', 'tv', 'anime', 'music', 'game');

create table works (
    id          text primary key,               -- '<source>:<source_id>'
    media       media_type not null,
    source      text not null,
    source_id   text not null,
    title       text not null,
    year        smallint,
    overview    text,
    vibe_text   text,                           -- text fed to the embedder
    tags        text[] not null default '{}',
    facets      jsonb not null default '{}'::jsonb,
    images      jsonb not null default '{}'::jsonb,
    popularity  real not null default 0,
    embedding   vector(384),                    -- all-MiniLM-L6-v2
    raw         jsonb,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    unique (source, source_id)
);

-- Cross-source identity (e.g. TMDB ↔ AniList, Deezer ↔ MusicBrainz ISRC)
create table work_links (
    work_id     text not null references works (id) on delete cascade,
    scheme      text not null,                  -- 'imdb', 'mbid', 'isrc', 'igdb', 'steam_appid'…
    value       text not null,
    primary key (work_id, scheme, value)
);

-- Where to watch / buy (TMDB watch providers, data by JustWatch)
create table availability (
    work_id     text not null references works (id) on delete cascade,
    region      char(2) not null default 'IN',
    provider    text not null,
    kind        text not null check (kind in ('flatrate', 'rent', 'buy', 'free', 'ads')),
    link        text,
    logo        text,
    fetched_at  timestamptz not null default now(),
    primary key (work_id, region, provider, kind)
);

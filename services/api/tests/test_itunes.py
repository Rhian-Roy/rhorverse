import json
from pathlib import Path

import httpx
import psycopg

from rhorverse.ingest import itunes
from rhorverse.ingest.http import Http

FIX = Path(__file__).parent / "fixtures" / "itunes"


def load(name: str) -> dict:
    return json.loads((FIX / name).read_text())


def fake_http(tmp_path: Path, seen: list[httpx.Request]) -> Http:
    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        url = request.url
        if url.host == "rss.marketingtools.apple.com":
            return httpx.Response(200, json=load("chart.json"))
        if url.path == "/lookup" and url.params.get("entity") == "song":
            return httpx.Response(200, json=load(f"tracks_{url.params['id']}.json"))
        if url.path == "/lookup":
            return httpx.Response(200, json=load("lookup_chart.json"))
        if url.path == "/search" and "arijit" in url.params["term"].lower():
            return httpx.Response(200, json=load("search_arijit.json"))
        return httpx.Response(200, json={"resultCount": 0, "results": []})

    return Http(
        "itunes", rate=1000, cache_root=tmp_path, client=httpx.Client(transport=httpx.MockTransport(handler))
    )


def test_row_mapping_and_artwork_resize():
    album = load("lookup_chart.json")["results"][0]
    row = itunes.to_work_row(album, itunes.chart_popularity(1))
    assert (row.media, row.source, row.source_id) == ("music", "itunes", "1193069171")
    assert (row.title, row.year, row.popularity) == ("Best of Arijit Singh", 2016, 1090.0)
    assert row.images["square"].endswith("/600x600bb.jpg")
    assert row.tags == ["Bollywood", "Arijit Singh"]
    assert row.extra == {"artist": ["Arijit Singh"], "genre": ["Bollywood"], "tracks": ["14"]}
    assert itunes.apple_links(album) == [
        ("apple_url", "https://music.apple.com/in/album/best-of-arijit-singh/1193069171")
    ]


def test_artist_search_drops_singles_and_other_artists(tmp_path: Path):
    seen: list[httpx.Request] = []
    albums = itunes.artist_albums(fake_http(tmp_path, seen), "Arijit Singh")
    assert [a["collectionId"] for a in albums] == [1193069171, 2001]
    assert seen[0].url.params["country"] == "IN"
    assert seen[0].url.params["attribute"] == "artistTerm"


def test_collect_keeps_chart_order_and_best_popularity(tmp_path: Path):
    picked = itunes.collect(fake_http(tmp_path, []), cap=10, artists=["Arijit Singh", "Nobody Here"])
    by_id = {a["collectionId"]: pop for a, pop in picked}
    assert by_id == {1858961207: 1100.0, 1193069171: 1090.0, 2001: 150.0}  # chart rank beats search pos 0


def test_collect_respects_cap(tmp_path: Path):
    assert len(itunes.collect(fake_http(tmp_path, []), cap=1, artists=["Arijit Singh"])) == 1


def test_seed_file_has_artists():
    artists = itunes.seed_artists()
    assert len(artists) >= 50
    assert "Arijit Singh" in artists
    assert not any(a.startswith("#") for a in artists)


def test_store_is_idempotent_and_keeps_embedding(conn: psycopg.Connection, tmp_path: Path):
    picked = itunes.collect(fake_http(tmp_path, []), cap=10, artists=["Arijit Singh"])
    assert itunes.store(conn, picked) == 3
    conn.execute(
        "update works set embedding = array_fill(0.1::real, array[384])::vector where id = 'itunes:2001'"
    )
    itunes.store(conn, picked)
    row = conn.execute(
        "select count(*) filter (where id in ('itunes:1193069171', 'itunes:1858961207', 'itunes:2001')) "
        "as n, "
        "bool_and(embedding is not null) filter (where id = 'itunes:2001') as kept from works"
    ).fetchone()
    assert (row["n"], row["kept"]) == (3, True)

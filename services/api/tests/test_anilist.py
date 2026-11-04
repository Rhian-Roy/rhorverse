import json
from pathlib import Path

import httpx
import psycopg

from rhorverse.ingest import anilist
from rhorverse.ingest.http import Http

FIX = Path(__file__).parent / "fixtures" / "anilist"
SPOILERS = {"Shapeshifting", "Tragedy"}


def load(name: str) -> dict:
    return json.loads((FIX / name).read_text())


def media(name: str = "page1.json") -> list[dict]:
    return load(name)["data"]["Page"]["media"]


def fake_http(tmp_path: Path, seen: list[httpx.Request]) -> Http:
    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        page = json.loads(request.content)["variables"]["page"]
        return httpx.Response(200, json=load(f"page{page}.json"))

    client = httpx.Client(transport=httpx.MockTransport(handler), headers={"User-Agent": "Rhorverse/test"})
    return Http("anilist", rate=1000, cache_root=tmp_path, client=client)


def test_row_mapping():
    row = anilist.to_work_row(media()[0])
    assert (row.media, row.source, row.source_id) == ("anime", "anilist", "16498")
    assert (row.title, row.year) == ("Attack on Titan", 2013)
    assert row.popularity == 3900.0
    assert row.images["backdrop"].endswith("16498.jpg")
    assert row.extra["romaji"] == ["Shingeki no Kyojin"]


def test_spoiler_tags_never_stored():
    row = anilist.to_work_row(media()[0])
    assert row.tags == ["Action", "Drama", "Survival", "Military"]  # Gore dropped: rank < 60
    assert not SPOILERS & set(row.tags)
    assert not any(s in row.vibe_text for s in SPOILERS)


def test_description_is_cleaned():
    text = anilist.to_work_row(media()[0]).overview
    assert (
        text == "Several hundred years ago, humans were nearly exterminated by Titans. Humanity fights back."
    )
    assert anilist.clean_description(None) is None


def test_fallbacks_when_fields_missing():
    row = anilist.to_work_row(media("page2.json")[0])
    assert (row.title, row.year, row.overview) == ("Kono Subarashii Sekai", 2016, None)
    assert "backdrop" not in row.images
    assert anilist.mal_links(media("page2.json")[0]) == []


def test_fetch_pages_until_last_and_respects_cap(tmp_path: Path):
    seen: list[httpx.Request] = []
    items = anilist.fetch(fake_http(tmp_path, seen), cap=10)
    assert [m["id"] for m in items] == [16498, 20, 99999]
    assert len(seen) == 2
    body = json.loads(seen[0].content)
    assert "type: ANIME" in body["query"]
    assert "isAdult: false" in body["query"]
    assert seen[0].headers["User-Agent"] == "Rhorverse/test"
    assert len(anilist.fetch(fake_http(tmp_path / "b", []), cap=1)) == 1


def test_store_is_idempotent_and_keeps_embedding(conn: psycopg.Connection, tmp_path: Path):
    items = anilist.fetch(fake_http(tmp_path, []), cap=10)
    assert anilist.store(conn, items) == 3
    conn.execute(
        "update works set embedding = array_fill(0.1::real, array[384])::vector where id = 'anilist:20'"
    )
    anilist.store(conn, items)
    n = conn.execute(
        "select count(*) as n from works where source = 'anilist' and id in "
        "('anilist:16498', 'anilist:20', 'anilist:99999')"
    ).fetchone()["n"]
    assert n == 3
    kept = conn.execute("select embedding is not null as ok from works where id = 'anilist:20'").fetchone()
    assert kept["ok"]
    links = conn.execute(
        "select value from work_links where work_id = 'anilist:20' and scheme = 'mal'"
    ).fetchall()
    assert [r["value"] for r in links] == ["20"]

from pathlib import Path

import pytest

from rhorverse.imports.letterboxd import ImportedItem, parse

FIXTURES = Path(__file__).parent / "fixtures" / "letterboxd"


def load(name: str) -> list[ImportedItem]:
    return list(parse((FIXTURES / name).read_text(encoding="utf-8")))


def test_watched_strips_bom_and_skips_nameless_rows():
    items = load("watched.csv")
    assert items[0] == ImportedItem("The Matrix", 1999, "2024-01-03", None)
    assert len(items) == 11
    assert ImportedItem("Paddington 2", None, "2024-01-14", None) in items
    assert any(i.title == "Amélie" for i in items)


def test_ratings_and_bad_values():
    by_title = {i.title: i for i in load("ratings.csv")}
    assert by_title["Parasite"].rating == 4.5
    assert by_title["Bad Rating"].rating is None


def test_diary_rewatch_keeps_latest_watch():
    heat = next(i for i in load("diary.csv") if i.title == "Heat")
    assert (heat.watched_at, heat.rating) == ("2024-02-28", 4.0)


def test_rejects_other_csv():
    with pytest.raises(ValueError):
        list(parse("Title,Date\nFoo,2024-01-01\n"))

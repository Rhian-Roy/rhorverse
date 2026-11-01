from dataclasses import dataclass

from rhorverse.rec.exclude import apply, excluded_ids


@dataclass
class W:
    id: str


def test_consumed_and_disliked_are_excluded():
    ids = excluded_ids([("a", "consumed"), ("b", "like"), ("c", "dislike")])
    assert ids == {"a", "c"}
    assert [w.id for w in apply([W("a"), W("b"), W("c"), W("d")], ids)] == ["b", "d"]

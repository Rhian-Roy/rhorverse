from rhorverse.rec.fuse import rrf


def test_item_in_both_lists_beats_item_in_one():
    assert rrf([["a", "b", "c"], ["c", "d"]])[0] == "c"


def test_single_list_keeps_order():
    assert rrf([["x", "y", "z"]]) == ["x", "y", "z"]


def test_duplicates_within_a_list_count_once():
    assert rrf([["a", "a", "b"]]) == ["a", "b"]


def test_empty_input():
    assert rrf([]) == []
    assert rrf([[], []]) == []

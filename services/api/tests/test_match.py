from rhorverse.eval.metrics import ndcg_at_k
from rhorverse.imports.match import Candidate, best_match, normalize_title


def test_normalize_strips_articles_and_punctuation():
    assert normalize_title("The Matrix: Reloaded!") == "matrix reloaded"


def test_best_match_uses_year_to_disambiguate():
    cands = [Candidate("1", "Dune", 1984), Candidate("2", "Dune", 2021)]
    assert best_match("Dune", 2021, cands) == cands[1]


def test_no_match_below_threshold():
    assert best_match("Completely Different", None, [Candidate("1", "Dune", 2021)]) is None


def test_ndcg_perfect_and_zero():
    assert ndcg_at_k(["a", "b"], {"a", "b"}) == 1.0
    assert ndcg_at_k(["x", "y"], {"a"}) == 0.0

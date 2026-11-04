from rhorverse.repo import source_url


def test_source_url_per_provider():
    assert (
        source_url({"source": "tmdb", "source_id": "movie/603"}, {}) == "https://www.themoviedb.org/movie/603"
    )
    assert source_url({"source": "anilist", "source_id": "20"}, {}) == "https://anilist.co/anime/20"
    assert source_url({"source": "rawg", "source_id": "1"}, {"rawg_slug": "hk"}) == "https://rawg.io/games/hk"


def test_source_url_missing_pieces():
    assert source_url({"source": "rawg", "source_id": "1"}, {}) is None
    assert source_url({"source": "test", "source_id": "x"}, {}) is None

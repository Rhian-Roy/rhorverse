"""Map raw source tags to a small shared facet vocabulary (mood, pace, setting…)."""

FACET_RULES: dict[str, dict[str, str]] = {
    "mood": {
        "dark": "dark",
        "noir": "dark",
        "feel-good": "uplifting",
        "wholesome": "uplifting",
        "cozy": "cozy",
    },
    "pace": {"slow-burn": "slow", "action": "fast", "roguelike": "fast", "ambient": "slow"},
    "setting": {"space": "space", "sci-fi": "space", "cyberpunk": "neon city", "india": "india"},
}


def facets_for(tags: list[str]) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    lowered = {t.lower() for t in tags}
    for facet, rules in FACET_RULES.items():
        values = sorted({v for tag, v in rules.items() if tag in lowered})
        if values:
            out[facet] = values
    return out


# TODO: optional LLM extraction (GEMINI_API_KEY) for works with sparse tags.

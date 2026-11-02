"""Row → response-model mapping shared by routers."""

from typing import Any

from rhorverse.schemas import ImageSet, Work


def row_to_work(row: dict[str, Any]) -> Work:
    return Work(
        id=row["id"],
        media=row["media"],
        title=row["title"],
        year=row["year"],
        overview=row["overview"],
        tags=list(row["tags"] or []),
        images=ImageSet(**(row["images"] or {})),
        source=row["source"],
        source_id=row["source_id"],
    )

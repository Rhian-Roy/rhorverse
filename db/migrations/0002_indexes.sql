-- 0002: ANN, facet/tag and fuzzy-title indexes
create index works_embedding_hnsw on works using hnsw (embedding vector_cosine_ops)
    with (m = 16, ef_construction = 64);
create index works_tags_gin   on works using gin (tags);
create index works_facets_gin on works using gin (facets jsonb_path_ops);
create index works_title_trgm on works using gin (title gin_trgm_ops);
create index works_media_pop  on works (media, popularity desc);

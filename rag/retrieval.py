import math
import re

from db import get_connection
from rag.embeddings import embed_text
from rag.reranker import rerank_chunks
from rag.store import ensure_regulation_columns
from config import RERANK_CANDIDATES, RERANK_TOP_K

VECTOR_CANDIDATES = RERANK_CANDIDATES
MAX_PER_SOURCE_TYPE = 4
QUESTION_TAIL = re.compile(
    r"[\s?!.]*(nedir|ne demek|ne anlama gelir|açıkla|nedir\s*)[\s?!.]*$",
    flags=re.IGNORECASE,
)

CHUNK_SELECT = """
    id, source_type, source_name, content,
    embedding <=> %s::vector AS distance,
    regulation_source, last_updated_date, regulation_reference
"""


def vector_to_literal(vector: list[float]) -> str:
    return "[" + ",".join(str(value) for value in vector) + "]"


def _term_needle(query: str) -> str:
    raw = (query or "").strip()[:80]
    cleaned = QUESTION_TAIL.sub("", raw).strip(" ?!.")
    return cleaned or raw


def _row_to_chunk(row: tuple) -> dict:
    updated = row[6]
    if hasattr(updated, "isoformat"):
        updated = updated.isoformat()
    return {
        "id": row[0],
        "source_type": row[1],
        "source_name": row[2],
        "content": row[3],
        "distance": float(row[4]) if row[4] is not None else None,
        "regulation_source": row[5],
        "last_updated_date": updated,
        "regulation_reference": row[7],
    }


def _diversify(rows: list[tuple], limit: int) -> list[tuple]:
    selected = []
    overflow = []
    per_type = {}
    for row in rows:
        source_type = row[1]
        if per_type.get(source_type, 0) < MAX_PER_SOURCE_TYPE:
            selected.append(row)
            per_type[source_type] = per_type.get(source_type, 0) + 1
        else:
            overflow.append(row)
        if len(selected) >= limit:
            return selected[:limit]
    for row in overflow:
        if len(selected) >= limit:
            break
        selected.append(row)
    return selected[:limit]


def _cosine_distance(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 1.0
    dot = 0.0
    left_norm = 0.0
    right_norm = 0.0
    for a, b in zip(left, right):
        dot += a * b
        left_norm += a * a
        right_norm += b * b
    if left_norm <= 0 or right_norm <= 0:
        return 1.0
    similarity = dot / (math.sqrt(left_norm) * math.sqrt(right_norm))
    return 1.0 - similarity


def retrieve_from_corpus(
    query: str, corpus: list[dict], limit: int, rerank: bool = True
) -> list[dict]:
    """Search only the given in-memory chunks (no Neon)."""
    if not corpus:
        return []
    query_vector = embed_text(query)
    scored = []
    for chunk in corpus:
        item = dict(chunk)
        item["distance"] = _cosine_distance(query_vector, chunk.get("embedding") or [])
        scored.append(item)
    scored.sort(key=lambda item: item["distance"])
    candidates = scored[: max(limit, VECTOR_CANDIDATES)]
    if not rerank:
        return candidates[:limit]
    return rerank_chunks(query, candidates, limit)


def retrieve_chunks(
    query: str,
    limit: int | None = None,
    rerank: bool = True,
    corpus: list[dict] | None = None,
) -> list[dict]:
    """Return the closest knowledge chunks, optionally from a session corpus."""
    top_k = RERANK_TOP_K if limit is None else limit
    if corpus is not None:
        return retrieve_from_corpus(query, corpus, top_k, rerank=rerank)
    ensure_regulation_columns()
    query_vector = vector_to_literal(embed_text(query))
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT {CHUNK_SELECT}
                FROM knowledge_chunks
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (query_vector, query_vector, VECTOR_CANDIDATES),
            )
            vector_rows = cursor.fetchall()
            keyword_rows = []
            needle = _term_needle(query)
            if needle:
                cursor.execute(
                    f"""
                    SELECT {CHUNK_SELECT}
                    FROM knowledge_chunks
                    WHERE source_name ILIKE %s
                    ORDER BY
                        CASE WHEN lower(source_name) = lower(%s) THEN 0 ELSE 1 END,
                        embedding <=> %s::vector
                    LIMIT 4
                    """,
                    (query_vector, f"%{needle}%", needle, query_vector),
                )
                keyword_rows = cursor.fetchall()
        merged = []
        seen = set()
        for row in keyword_rows + vector_rows:
            if row[0] in seen:
                continue
            merged.append(row)
            seen.add(row[0])
        candidates = [_row_to_chunk(row) for row in merged[:VECTOR_CANDIDATES]]
        if not rerank:
            return candidates[:top_k]
        return rerank_chunks(query, candidates, top_k)
    finally:
        connection.close()

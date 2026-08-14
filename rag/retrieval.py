import re

from db import get_connection
from rag.embeddings import embed_text
from rag.store import ensure_regulation_columns

VECTOR_CANDIDATES = 14
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


def retrieve_chunks(query: str, limit: int = 8) -> list[dict]:
    """Return the closest knowledge chunks by cosine distance, mixed by source."""
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
                (query_vector, query_vector, max(limit, VECTOR_CANDIDATES)),
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
        mixed = _diversify(merged, limit)
        return [_row_to_chunk(row) for row in mixed]
    finally:
        connection.close()

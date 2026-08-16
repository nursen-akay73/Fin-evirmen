import math
import re

from db import get_connection
from rag.embeddings import embed_text
from rag.reranker import rerank_chunks
from rag.store import ensure_regulation_columns
from config import RERANK_CANDIDATES, RERANK_TOP_K

VECTOR_CANDIDATES = RERANK_CANDIDATES
MAX_PER_SOURCE_TYPE = 4
LAW_SOURCE = "mevzuat"
LAW_CANDIDATES = 4


def _law_boost_query(query: str) -> str | None:
    blob = (query or "").lower()
    if any(word in blob for word in ("cayma", "14 gün", "ondört")):
        return "tüketici kredisi cayma hakkı on dört gün 6502 MADDE 24"
    if any(word in blob for word in ("aidat", "üyelik ücret", "kart aidat")):
        return (
            "kart çıkaran kuruluşlar yıllık üyelik aidatı sunmak zorundadır "
            "6502 MADDE 31 TCMB MADDE 11"
        )
    if any(word in blob for word in ("tahsis", "dosya masraf", "kredi masraf", "binde")):
        return "kredi tahsis ücreti binde beş TCMB MADDE 10 6502 MADDE 4"
    return None


def legal_basis_line(chunks: list[dict], language: str = "tr") -> str:
    law = [item for item in chunks if item.get("source_type") == LAW_SOURCE]
    if not law:
        return ""
    bits = []
    for item in law:
        source = (item.get("regulation_source") or "").strip()
        ref = (item.get("regulation_reference") or "").strip()
        label = " ".join(part for part in (source, ref) if part)
        if label and label not in bits:
            bits.append(label)
    if not bits:
        return ""
    bits.sort(key=lambda item: (0 if "TCMB" in item else 1, item))
    joined = " ve ".join(bits)
    blob = joined.lower()
    if str(language or "").startswith("en"):
        return f"📌 Legal basis: {joined}."
    if "madde 10" in blob:
        suffix = "tahsis ücreti kredi anaparasının binde beşini aşamaz."
    elif "madde 24" in blob:
        suffix = "tüketici 14 gün içinde krediden cayabilir."
    elif "madde 31" in blob or "madde 11" in blob:
        suffix = "kart çıkaran kuruluşlar aidatsız kart sunmak zorundadır."
    else:
        suffix = "ilgili kuruluş bu hükümlere uymak zorundadır."
    return f"📌 Yasal Dayanak: {joined} uyarınca {suffix}"


def _fetch_nearest(cursor, query_vector: str, limit: int, source_type: str | None = None):
    if source_type:
        cursor.execute(
            f"""
            SELECT {CHUNK_SELECT}
            FROM knowledge_chunks
            WHERE source_type = %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            (query_vector, source_type, query_vector, limit),
        )
    else:
        cursor.execute(
            f"""
            SELECT {CHUNK_SELECT}
            FROM knowledge_chunks
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            (query_vector, query_vector, limit),
        )
    return cursor.fetchall()
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


def _article_key(item: dict) -> tuple:
    return (
        item.get("source_type"),
        item.get("regulation_source") or "",
        item.get("regulation_reference") or item.get("source_name") or "",
    )


def _mix_laws(ranked: list[dict], candidates: list[dict], top_k: int) -> list[dict]:
    selected = []
    seen = set()
    for item in ranked:
        key = (
            _article_key(item)
            if item.get("source_type") == LAW_SOURCE
            else item.get("id")
        )
        if key in seen:
            continue
        seen.add(key)
        selected.append(item)
    laws = [
        item
        for item in candidates
        if item.get("source_type") == LAW_SOURCE and _article_key(item) not in seen
    ]
    law_count = sum(1 for item in selected if item.get("source_type") == LAW_SOURCE)
    while laws and law_count < 2:
        extra = laws.pop(0)
        key = _article_key(extra)
        if len(selected) >= top_k:
            replaced = False
            for index in range(len(selected) - 1, -1, -1):
                if selected[index].get("source_type") != LAW_SOURCE:
                    selected[index] = extra
                    replaced = True
                    break
            if not replaced:
                selected[-1] = extra
        else:
            selected.append(extra)
        seen.add(key)
        law_count += 1
    if not any(item.get("source_type") == LAW_SOURCE for item in selected) and laws:
        extra = laws[0]
        if selected:
            selected[-1] = extra
        else:
            selected.append(extra)
    return selected[:top_k]


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
            vector_rows = _fetch_nearest(cursor, query_vector, VECTOR_CANDIDATES)
            law_rows = _fetch_nearest(
                cursor, query_vector, LAW_CANDIDATES, source_type=LAW_SOURCE
            )
            boost = _law_boost_query(query)
            if boost:
                boost_vector = vector_to_literal(embed_text(boost))
                law_rows = (
                    _fetch_nearest(
                        cursor, boost_vector, LAW_CANDIDATES, source_type=LAW_SOURCE
                    )
                    + law_rows
                )
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
        seen_ids = set()
        seen_articles = set()
        for row in law_rows + keyword_rows + vector_rows:
            if row[0] in seen_ids:
                continue
            if row[1] == LAW_SOURCE:
                article = (row[5], row[7])
                if article in seen_articles:
                    continue
                seen_articles.add(article)
            merged.append(row)
            seen_ids.add(row[0])
        candidates = [_row_to_chunk(row) for row in merged[: VECTOR_CANDIDATES + LAW_CANDIDATES]]
        if not rerank:
            return candidates[:top_k]
        ranked = rerank_chunks(query, candidates, top_k)
        return _mix_laws(ranked, candidates, top_k)
    finally:
        connection.close()

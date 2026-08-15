from functools import lru_cache

from sentence_transformers import CrossEncoder

from config import RERANKER_MODEL


@lru_cache(maxsize=1)
def get_reranker() -> CrossEncoder:
    return CrossEncoder(RERANKER_MODEL)


def warmup_reranker() -> None:
    get_reranker()


def rerank_chunks(query: str, chunks: list[dict], top_k: int) -> list[dict]:
    """Score (query, chunk) pairs and keep the highest-scoring top_k."""
    if not chunks or top_k <= 0:
        return []
    if len(chunks) <= top_k:
        return chunks

    model = get_reranker()
    pairs = [(query, chunk.get("content") or "") for chunk in chunks]
    scores = model.predict(pairs)
    ranked = sorted(
        zip(chunks, scores),
        key=lambda item: float(item[1]),
        reverse=True,
    )
    selected = []
    for chunk, score in ranked[:top_k]:
        item = dict(chunk)
        item["rerank_score"] = float(score)
        selected.append(item)
    return selected

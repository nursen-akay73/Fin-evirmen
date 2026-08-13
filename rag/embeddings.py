from functools import lru_cache

from fastembed import TextEmbedding

from config import EMBEDDING_MODEL


@lru_cache(maxsize=1)
def get_model() -> TextEmbedding:
    return TextEmbedding(model_name=EMBEDDING_MODEL)


def embed_text(text: str) -> list[float]:
    vector = next(get_model().embed([text]))
    return [float(value) for value in vector]


def embed_texts(texts: list[str]) -> list[list[float]]:
    return [[float(value) for value in vector] for vector in get_model().embed(texts)]

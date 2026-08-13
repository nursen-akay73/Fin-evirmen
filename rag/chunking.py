def chunk_text(text: str, chunk_size: int = 500, overlap: int = 80) -> list[str]:
    """Split text into overlapping character windows for RAG context."""
    normalized = " ".join((text or "").split())
    if not normalized:
        return []

    chunks = []
    start = 0
    length = len(normalized)
    while start < length:
        end = min(start + chunk_size, length)
        chunks.append(normalized[start:end])
        if end >= length:
            break
        start = max(end - overlap, start + 1)
    return chunks

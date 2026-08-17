"""Shared retrieve-then-rerank pipeline for the web app and MCP server."""

from rag.llm_client import generate_answer
from rag.petitions import build_petition_draft
from rag.retrieval import legal_basis_line, retrieve_chunks
from rag.store import count_chunks

_SNIPPET_SKIP = (
    "[Kaynak:",
    "Dosya:",
    "Sayfa:",
    "Belge:",
    "Madde:",
    "Kategori:",
    "Terim:",
)


def _snippet(text: str, limit: int = 280) -> str:
    lines = []
    for line in (text or "").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if any(stripped.startswith(prefix) for prefix in _SNIPPET_SKIP):
            continue
        lines.append(stripped)
    snippet = " ".join(lines)
    snippet = " ".join(snippet.split())
    if len(snippet) <= limit:
        return snippet
    clipped = snippet[: limit - 1].rsplit(" ", 1)[0]
    return (clipped or snippet[:limit]).rstrip() + "…"


def chunk_source(chunk: dict) -> dict:
    return {
        "source_name": chunk.get("source_name"),
        "source_type": chunk.get("source_type"),
        "page_number": chunk.get("page_number"),
        "regulation_source": chunk.get("regulation_source"),
        "last_updated_date": chunk.get("last_updated_date"),
        "regulation_reference": chunk.get("regulation_reference"),
        "snippet": _snippet(chunk.get("content") or ""),
    }


def retrieve_for_question(question: str, limit: int = 3) -> list[dict]:
    return retrieve_chunks((question or "").strip(), limit=limit)


def answer_question(question: str, language: str = "tr") -> dict:
    lang = "en" if str(language or "").strip().lower().startswith("en") else "tr"
    question = (question or "").strip()
    if not question:
        return {
            "ok": False,
            "status": 400,
            "error": (
                "Please enter a question or a short text."
                if lang == "en"
                else "Lütfen bir soru veya metin yazın."
            ),
            "answer": None,
            "sources": [],
        }

    chunks = retrieve_for_question(question, limit=3)
    if not chunks:
        return {
            "ok": False,
            "status": 404,
            "error": (
                "No matching records in the knowledge base. Run python scripts/ingest_data.py first."
                if lang == "en"
                else "Bilgi tabanında ilgili kayıt bulunamadı. "
                "Önce python scripts/ingest_data.py komutunu çalıştırın."
            ),
            "answer": None,
            "sources": [],
        }

    answer = generate_answer(
        question,
        [chunk["content"] for chunk in chunks],
        extra_instructions=(
            "If the context contains official statute text, end with one line: "
            "'📌 Legal basis: ...' using only article numbers in the context."
            if lang == "en"
            else "Bağlamda resmi mevzuat varsa cevabın sonuna tek satır ekle: "
            "'📌 Yasal Dayanak: ...' Yalnızca bağlamdaki kanun/tebliğ ve madde numarasını yaz; uydurma."
        ),
        last_updated_dates=[chunk.get("last_updated_date") for chunk in chunks],
        language=lang,
    )
    basis = legal_basis_line(chunks, language=lang)
    if basis and "Yasal Dayanak" not in answer and "Legal basis" not in answer:
        answer = answer.rstrip() + "\n\n" + basis
    return {
        "ok": True,
        "status": 200,
        "error": None,
        "answer": answer,
        "sources": [chunk_source(chunk) for chunk in chunks],
    }


def knowledge_overview() -> dict:
    return count_chunks()


def draft_petition(
    topic: str,
    bank: str = "",
    clause: str = "",
    place: str = "",
    letter_date: str = "",
    language: str = "tr",
) -> dict:
    lang = "en" if str(language or "").strip().lower().startswith("en") else "tr"
    return build_petition_draft(
        topic=topic or "",
        clause=clause or "",
        bank=bank or "",
        letter_date=letter_date or "",
        lang=lang,
        place=place or "................",
    )

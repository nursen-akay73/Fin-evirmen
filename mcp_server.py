"""FinÇevirmen MCP server — exposes the same retrieve-then-rerank RAG as the web app.

Run (stdio):  ./venv/bin/python mcp_server.py
Cursor: project .cursor/mcp.json
"""

from pathlib import Path
import os
import sys

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from mcp.server.mcpserver import MCPServer

from rag.pipeline import (
    answer_question,
    draft_petition,
    knowledge_overview,
    retrieve_for_question,
    chunk_source,
)

mcp = MCPServer(
    "FinÇevirmen",
    instructions=(
        "FinÇevirmen is a grounded RAG assistant for Turkish consumer-finance "
        "language (glossary, Law 6502, CBRT 2020/7). Use retrieve or ask for "
        "terms, fees, withdrawal rights and contract jargon. Do not invent "
        "statute numbers. Draft petitions are drafts, not legal advice. "
        "Do not mix in stock-market or blog tools."
    ),
)


@mcp.tool()
def retrieve(question: str) -> dict:
    """Retrieve ranked knowledge chunks (glossary + statutes) without calling the LLM."""
    question = (question or "").strip()
    if not question:
        return {"ok": False, "error": "Soru boş.", "chunks": []}
    chunks = retrieve_for_question(question, limit=3)
    return {
        "ok": True,
        "chunks": [chunk_source(chunk) for chunk in chunks],
    }


@mcp.tool()
def ask(question: str, language: str = "tr") -> dict:
    """Answer a consumer-finance question using retrieve-then-rerank RAG only."""
    return answer_question(question, language=language)


@mcp.tool()
def draft_consumer_petition(
    topic: str,
    bank: str = "",
    clause: str = "",
    place: str = "",
    letter_date: str = "",
    language: str = "tr",
) -> dict:
    """Draft a consumer-arbitration petition (aidat, masraf or cayma). Not legal advice."""
    topic = (topic or "").strip()
    if not topic:
        return {"ok": False, "error": "Konu boş."}
    draft = draft_petition(
        topic=topic,
        bank=bank,
        clause=clause,
        place=place,
        letter_date=letter_date,
        language=language,
    )
    draft["ok"] = True
    draft["disclaimer"] = draft.get("disclaimer") or (
        "Taslak metindir; hukuki tavsiye değildir."
    )
    return draft


@mcp.tool()
def knowledge_stats() -> dict:
    """Count indexed RAG chunks by source type."""
    return {"ok": True, **knowledge_overview()}


if __name__ == "__main__":
    mcp.run()

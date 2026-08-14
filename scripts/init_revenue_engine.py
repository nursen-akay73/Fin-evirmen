"""Additive schema for the isolated revenue engine. Does not alter RAG tables."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from modules.revenue_engine.store import ensure_schema, get_or_create_default_project


def main():
    ensure_schema()
    project = get_or_create_default_project()
    print(
        "Revenue engine tabloları eklendi "
        f"(proje id={project['id']}, ad={project['name']})."
    )
    print("Mevcut knowledge_chunks / user_documents tablolarına dokunulmadı.")


if __name__ == "__main__":
    main()

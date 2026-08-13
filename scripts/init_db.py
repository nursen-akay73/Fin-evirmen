"""Neon üzerinde pgvector şemasını kurar."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from db import get_connection

STATEMENTS = [
    "CREATE EXTENSION IF NOT EXISTS vector;",
    """
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id SERIAL PRIMARY KEY,
        source_type VARCHAR(50) NOT NULL,
        source_name VARCHAR(255),
        content TEXT NOT NULL,
        embedding VECTOR(384),
        created_at TIMESTAMP DEFAULT NOW()
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS user_documents (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255),
        extracted_text TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW()
    );
    """,
]

INDEX_SQL = """
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw
ON knowledge_chunks
USING hnsw (embedding vector_cosine_ops);
"""


def main():
    connection = get_connection()
    connection.autocommit = True
    try:
        with connection.cursor() as cursor:
            for statement in STATEMENTS:
                cursor.execute(statement)
            print("Tablolar oluşturuldu (knowledge_chunks, user_documents).")
            try:
                cursor.execute(INDEX_SQL)
                print("HNSW vektör index'i oluşturuldu.")
            except Exception as index_error:
                print(
                    "Index oluşturulamadı; tablolar yine de hazır. "
                    f"Ayrıntı: {index_error}"
                )
        print("Veritabanı şeması hazır.")
    except Exception as error:
        print("Veritabanı kurulurken hata oluştu.")
        print(
            "Neon panelinde pgvector eklentisinin açık olduğundan emin olun "
            "(SQL Editor'da: CREATE EXTENSION IF NOT EXISTS vector;)."
        )
        print(f"Ayrıntı: {error}")
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    main()

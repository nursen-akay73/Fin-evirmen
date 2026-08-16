"""Resmi mevzuat PDF'lerini madde bazlı chunk'layıp Neon'a yazar."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from db import get_connection
from rag.embeddings import embed_texts
from rag.law_chunking import load_law_rows
from rag.store import ensure_regulation_columns, vector_to_literal

LAWS_DIR = ROOT / "data" / "knowledge_base" / "laws"
SOURCE_TYPE = "mevzuat"


def main():
    ensure_regulation_columns()
    rows = load_law_rows(LAWS_DIR)
    if not rows:
        raise SystemExit("İndekslenecek mevzuat parçası bulunamadı.")
    print(f"{len(rows)} mevzuat parçası için embedding üretiliyor...")
    vectors = []
    batch_size = 32
    contents = [row[1] for row in rows]
    for start in range(0, len(contents), batch_size):
        batch = contents[start : start + batch_size]
        vectors.extend(embed_texts(batch))
        print(f"  embedding {min(start + batch_size, len(contents))}/{len(contents)}")

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM knowledge_chunks WHERE source_type = %s",
                (SOURCE_TYPE,),
            )
            for row, vector in zip(rows, vectors):
                name, content, source, updated, reference = row
                cursor.execute(
                    """
                    INSERT INTO knowledge_chunks
                        (source_type, source_name, content, embedding,
                         regulation_source, last_updated_date, regulation_reference)
                    VALUES (%s, %s, %s, %s::vector, %s, %s, %s)
                    """,
                    (
                        SOURCE_TYPE,
                        name,
                        content,
                        vector_to_literal(vector),
                        source,
                        updated,
                        reference,
                    ),
                )
        connection.commit()
        print(f"{len(rows)} mevzuat parçası Neon'a yazıldı (source_type={SOURCE_TYPE}).")
    finally:
        connection.close()


if __name__ == "__main__":
    main()

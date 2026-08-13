from db import get_connection
from rag.embeddings import embed_texts


def vector_to_literal(vector: list[float]) -> str:
    return "[" + ",".join(str(value) for value in vector) + "]"


def insert_chunks(
    source_type: str,
    rows: list[tuple[str, str]],
    replace_names: bool = True,
) -> int:
    """Embed and insert (name, content) rows into knowledge_chunks."""
    if not rows:
        return 0
    vectors = embed_texts([content for _, content in rows])
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            for (name, content), vector in zip(rows, vectors):
                if replace_names:
                    cursor.execute(
                        """
                        DELETE FROM knowledge_chunks
                        WHERE source_type = %s AND source_name = %s
                        """,
                        (source_type, name),
                    )
                cursor.execute(
                    """
                    INSERT INTO knowledge_chunks
                        (source_type, source_name, content, embedding)
                    VALUES (%s, %s, %s, %s::vector)
                    """,
                    (source_type, name, content, vector_to_literal(vector)),
                )
        connection.commit()
        return len(rows)
    finally:
        connection.close()


def count_chunks() -> dict:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT source_type, COUNT(*)
                FROM knowledge_chunks
                GROUP BY source_type
                ORDER BY source_type
                """
            )
            by_type = {row[0]: int(row[1]) for row in cursor.fetchall()}
            cursor.execute("SELECT COUNT(*) FROM knowledge_chunks")
            total = int(cursor.fetchone()[0])
        return {"total": total, "by_type": by_type}
    finally:
        connection.close()

from datetime import date

from db import get_connection
from rag.embeddings import embed_texts

ALTER_COLUMNS = [
    "ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS regulation_source VARCHAR(120);",
    "ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS last_updated_date DATE;",
    "ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS regulation_reference VARCHAR(255);",
]


def vector_to_literal(vector: list[float]) -> str:
    return "[" + ",".join(str(value) for value in vector) + "]"


def ensure_regulation_columns() -> None:
    connection = get_connection()
    connection.autocommit = True
    try:
        with connection.cursor() as cursor:
            for statement in ALTER_COLUMNS:
                cursor.execute(statement)
    finally:
        connection.close()


def _unpack_row(row, defaults: dict) -> tuple:
    name = row[0]
    content = row[1]
    if len(row) >= 5:
        return name, content, row[2], row[3], row[4]
    return (
        name,
        content,
        defaults.get("regulation_source"),
        defaults.get("last_updated_date"),
        defaults.get("regulation_reference"),
    )


def insert_chunks(
    source_type: str,
    rows: list[tuple],
    replace_names: bool = True,
    regulation_source: str | None = None,
    last_updated_date: date | str | None = None,
    regulation_reference: str | None = None,
) -> int:
    """Embed and insert (name, content[, meta]) rows into knowledge_chunks."""
    if not rows:
        return 0
    ensure_regulation_columns()
    defaults = {
        "regulation_source": regulation_source,
        "last_updated_date": last_updated_date,
        "regulation_reference": regulation_reference,
    }
    unpacked = [_unpack_row(row, defaults) for row in rows]
    vectors = embed_texts([content for _, content, *_ in unpacked])
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            for (name, content, source, updated, reference), vector in zip(
                unpacked, vectors
            ):
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
                        (source_type, source_name, content, embedding,
                         regulation_source, last_updated_date, regulation_reference)
                    VALUES (%s, %s, %s, %s::vector, %s, %s, %s)
                    """,
                    (
                        source_type,
                        name,
                        content,
                        vector_to_literal(vector),
                        source,
                        updated,
                        reference,
                    ),
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

"""data/ altındaki bilgi kaynaklarını chunk'layıp Neon'a yükler."""

import json
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from db import get_connection
from rag.chunking import chunk_text
from rag.embeddings import embed_texts

DATA_DIR = ROOT / "data"
PDF_DIR = DATA_DIR / "sozlesme_referans"
SOURCES = [
    {
        "file": "terim_sozlugu.json",
        "source_type": "terim_sozlugu",
        "kind": "term",
    },
    {
        "file": "sozlesme_maddeleri.json",
        "source_type": "sozlesme_maddesi",
        "kind": "clause",
    },
    {
        "file": "tuketici_rehberi.json",
        "source_type": "tuketici_rehberi",
        "kind": "guide",
    },
]


def vector_to_literal(vector: list[float]) -> str:
    return "[" + ",".join(str(value) for value in vector) + "]"


def join_aliases(values) -> str:
    if not values:
        return ""
    return ", ".join(values)


def item_meta(item: dict, default_source: str) -> tuple:
    return (
        item.get("regulation_source") or default_source,
        item.get("last_updated_date") or None,
        item.get("regulation_reference") or None,
    )


def format_term(item: dict) -> tuple:
    aliases = join_aliases(item.get("esanlam") or [])
    kategori = item.get("kategori") or "Genel"
    lines = [
        "[Kaynak: terim sözlüğü]",
        f"Kategori: {kategori}",
        f"Terim: {item['terim']}",
    ]
    if aliases:
        lines.append(f"Ayrıca şöyle de denir: {aliases}")
    lines.append(f"Açıklama: {item['aciklama']}")
    if item.get("ornek"):
        lines.append(f"Örnek: {item['ornek']}")
    if item.get("regulation_source"):
        lines.append(f"Mevzuat kaynağı: {item['regulation_source']}")
    if item.get("regulation_reference"):
        lines.append(f"Dayanak: {item['regulation_reference']}")
    return (item["terim"], "\n".join(lines)) + item_meta(item, "Genel Finansal Terim")


def format_clause(item: dict) -> tuple:
    lines = [
        "[Kaynak: sözleşme maddesi rehberi]",
        f"Kategori: {item.get('kategori') or 'Sözleşme'}",
        f"Madde: {item['baslik']}",
        f"Sözleşmede benzer dil: {item['madde_dili']}",
        f"Sade anlamı: {item['sade_anlam']}",
    ]
    if item.get("dikkat"):
        lines.append(f"Dikkat: {item['dikkat']}")
    if item.get("regulation_source"):
        lines.append(f"Mevzuat kaynağı: {item['regulation_source']}")
    if item.get("regulation_reference"):
        lines.append(f"Dayanak: {item['regulation_reference']}")
    return (item["baslik"], "\n".join(lines)) + item_meta(item, "BDDK")


def format_guide(item: dict) -> tuple:
    lines = [
        "[Kaynak: tüketici rehberi]",
        f"Kategori: {item.get('kategori') or 'Rehber'}",
        f"Soru: {item['baslik']}",
        f"Cevap: {item['icerik']}",
    ]
    return (item["baslik"], "\n".join(lines)) + item_meta(item, "Genel Finansal Terim")


FORMATTERS = {
    "term": format_term,
    "clause": format_clause,
    "guide": format_guide,
}


def load_source(spec: dict) -> list[tuple]:
    path = DATA_DIR / spec["file"]
    if not path.exists():
        raise FileNotFoundError(f"Kaynak bulunamadı: {path}")
    records = json.loads(path.read_text(encoding="utf-8"))
    formatter = FORMATTERS[spec["kind"]]
    return [formatter(item) for item in records]


def pretty_pdf_name(path: Path) -> str:
    return path.stem.replace("_", " ").replace("-", " ").strip() or path.name


def load_reference_pdfs() -> list[tuple]:
    if not PDF_DIR.exists():
        print(f"PDF klasörü yok, atlandı: {PDF_DIR}")
        return []

    rows = []
    pdfs = sorted({path.resolve(): path for path in PDF_DIR.glob("*.pdf")}.values())
    if not pdfs:
        print(f"{PDF_DIR}: PDF bulunamadı.")
        return []

    for path in pdfs:
        label = pretty_pdf_name(path)
        page_count = 0
        chunk_count = 0
        try:
            with pdfplumber.open(path) as pdf:
                for index, page in enumerate(pdf.pages, start=1):
                    text = (page.extract_text() or "").strip()
                    if not text:
                        continue
                    page_count += 1
                    for piece in chunk_text(text):
                        name = f"{label} — Sayfa {index}"
                        content = "\n".join(
                            [
                                "[Kaynak: sözleşme referansı]",
                                f"Dosya: {path.name}",
                                f"Sayfa: {index}",
                                piece,
                            ]
                        )
                        rows.append(
                            (
                                name,
                                content,
                                "Banka Sözleşmesi",
                                None,
                                None,
                            )
                        )
                        chunk_count += 1
        except Exception as error:
            print(f"{path.name}: okunamadı ({error})")
            continue
        if chunk_count == 0:
            print(f"{path.name}: metin çıkarılamadı (taranmış görüntü olabilir).")
        else:
            print(f"{path.name}: {page_count} sayfa, {chunk_count} parça")
    return rows


def insert_source(cursor, source_type: str, rows: list[tuple], vectors: list[list[float]]):
    cursor.execute(
        "DELETE FROM knowledge_chunks WHERE source_type = %s",
        (source_type,),
    )
    for row, vector in zip(rows, vectors):
        name, content = row[0], row[1]
        source = row[2] if len(row) > 2 else None
        updated = row[3] if len(row) > 3 else None
        reference = row[4] if len(row) > 4 else None
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


def main():
    from rag.store import ensure_regulation_columns

    ensure_regulation_columns()
    prepared = []
    for spec in SOURCES:
        rows = load_source(spec)
        prepared.append((spec["source_type"], spec["file"], rows))
        print(f"{spec['file']}: {len(rows)} kayıt")

    pdf_rows = load_reference_pdfs()
    if pdf_rows:
        prepared.append(("sozlesme_referans", "sozlesme_referans/", pdf_rows))

    all_contents = [row[1] for _, _, rows in prepared for row in rows]
    print(f"Toplam {len(all_contents)} parça için yerel embedding üretiliyor...")
    vectors = []
    batch_size = 64
    for start in range(0, len(all_contents), batch_size):
        batch = all_contents[start : start + batch_size]
        vectors.extend(embed_texts(batch))
        done = min(start + batch_size, len(all_contents))
        print(f"  embedding {done}/{len(all_contents)}")

    offset = 0
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            for source_type, _label, rows in prepared:
                chunk_vectors = vectors[offset : offset + len(rows)]
                insert_source(cursor, source_type, rows, chunk_vectors)
                offset += len(rows)
                print(f"{source_type}: {len(rows)} parça yazıldı.")
        connection.commit()
        print(f"{len(all_contents)} parça Neon'a yüklendi.")
    finally:
        connection.close()


if __name__ == "__main__":
    main()

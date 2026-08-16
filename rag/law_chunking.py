import re
from pathlib import Path

import pdfplumber

from rag.chunking import chunk_text

ARTICLE_RE = re.compile(
    r"(?P<full>(?P<temp>GEÇİCİ\s+)?MADDE\s+(?P<num>\d+[A-Z/]*)\s*[–-])",
    re.IGNORECASE,
)

LAW_FILES = {
    "6502-tuketici-kanunu.pdf": {
        "doc_name": "6502 Sayılı Tüketici Kanunu",
        "key": "6502",
        "updated": "2013-11-28",
        "source": "6502 sayılı Kanun",
    },
    "tcmb-ucretler-tebligi-2020-7.pdf": {
        "doc_name": "TCMB Ücretler Tebliği (2020/7)",
        "key": "tcmb",
        "updated": "2020-03-07",
        "source": "TCMB Tebliği (2020/7)",
    },
}


def extract_pdf_text(path: Path) -> str:
    with pdfplumber.open(path) as pdf:
        return "\n".join((page.extract_text() or "") for page in pdf.pages)


def categorize(doc_key: str, article_no: str, body: str) -> str:
    if doc_key == "6502":
        if article_no in {"24", "48"}:
            return "Cayma Hakkı"
        if article_no in {"31"}:
            return "Kredi Kartı Aidatı"
        if article_no in {"4", "22", "23", "37"}:
            return "Kredi Masrafları"
    if doc_key == "tcmb":
        if article_no == "10":
            return "Kredi Masrafları"
        if article_no == "11":
            return "Kredi Kartı Aidatı"
        if article_no in {"5", "8"}:
            return "Kredi Masrafları"
    blob = f"{article_no} {body}".lower()
    if any(word in blob for word in ("aidat", "üyelik ücret", "yıllık üyelik")):
        return "Kredi Kartı Aidatı"
    if any(word in blob for word in ("cayma", "on dört gün", "ondört gün")):
        return "Cayma Hakkı"
    if any(
        word in blob
        for word in ("tahsis ücret", "binde beş", "dosya", "istihbarat ücret")
    ):
        return "Kredi Masrafları"
    if any(word in blob for word in ("faiz", "gecikme", "akdî faiz", "efektif yıllık")):
        return "Faiz Kuralları"
    return "Mevzuat"


def split_articles(text: str) -> list[tuple[str, str, str]]:
    matches = list(ARTICLE_RE.finditer(text or ""))
    articles = []
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        block = text[start:end].strip()
        number = match.group("num")
        label = "Geçici Madde " + number if match.group("temp") else "Madde " + number
        if len(block) < 80:
            continue
        articles.append((number, label, block))
    return articles


def format_chunk(
    spec: dict, article_no: str, article_label: str, category: str, piece: str
) -> tuple:
    doc_name = spec["doc_name"]
    content = "\n".join(
        [
            "[Kaynak: resmi mevzuat]",
            f"Belge: {doc_name}",
            f"Madde: {article_label}",
            f"Kategori: {category}",
            piece.strip(),
        ]
    )
    name = f"{doc_name} — {article_label}"
    return (
        name,
        content,
        spec["source"],
        spec["updated"],
        article_label,
    )


def load_law_rows(laws_dir: Path) -> list[tuple]:
    rows = []
    for filename, spec in LAW_FILES.items():
        path = laws_dir / filename
        if not path.exists():
            print(f"Mevzuat PDF yok, atlandı: {path}")
            continue
        text = extract_pdf_text(path)
        articles = split_articles(text)
        print(f"{filename}: {len(articles)} madde")
        for number, label, block in articles:
            category = categorize(spec["key"], number, block)
            label = {
                ("6502", "31"): "Madde 31/3",
                ("tcmb", "11"): "Madde 11/1",
            }.get((spec["key"], number), label)
            pieces = chunk_text(block, chunk_size=1100, overlap=120) or [block]
            for piece in pieces:
                rows.append(format_chunk(spec, number, label, category, piece))
    return rows

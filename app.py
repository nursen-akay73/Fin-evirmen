from io import BytesIO
from datetime import date
from pathlib import Path

import pdfplumber
from flask import Flask, jsonify, request, send_from_directory

from db import get_connection
from rag.chunking import chunk_text
from rag.llm_client import (
    CONTRACT_SYSTEM_PROMPT,
    extract_text_from_image,
    generate_answer,
    transcribe_audio,
)
from rag.retrieval import retrieve_chunks
from rag.store import count_chunks, ensure_regulation_columns, insert_chunks

from modules.revenue_engine.api import revenue_bp

PAGES_DIR = Path(__file__).resolve().parent / "pages"
MAX_CONTRACT_CHUNKS = 12

app = Flask(__name__, static_folder=str(PAGES_DIR), static_url_path="")
app.register_blueprint(revenue_bp)
try:
    ensure_regulation_columns()
except Exception:
    pass


def _chunk_source(chunk: dict) -> dict:
    return {
        "source_name": chunk.get("source_name"),
        "source_type": chunk.get("source_type"),
        "page_number": chunk.get("page_number"),
        "regulation_source": chunk.get("regulation_source"),
        "last_updated_date": chunk.get("last_updated_date"),
        "regulation_reference": chunk.get("regulation_reference"),
    }


@app.get("/")
def index():
    response = send_from_directory(PAGES_DIR, "index.html")
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/bilgi")
def knowledge_page():
    response = send_from_directory(PAGES_DIR, "knowledge.html")
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/nasil-calisir")
def how_page():
    response = send_from_directory(PAGES_DIR, "how.html")
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/dashboard/revenue-splits")
def revenue_splits_page():
    response = send_from_directory(PAGES_DIR, "revenue-splits.html")
    response.headers["Cache-Control"] = "no-store"
    return response


@app.post("/api/ask")
def ask():
    payload = request.get_json(silent=True) or {}
    question = (payload.get("question") or "").strip()
    if not question:
        return jsonify({"error": "Lütfen bir soru veya metin yazın."}), 400

    try:
        chunks = retrieve_chunks(question, limit=8)
        if not chunks:
            return jsonify(
                {
                    "error": "Bilgi tabanında ilgili kayıt bulunamadı. "
                    "Önce python scripts/ingest_data.py komutunu çalıştırın."
                }
            ), 404

        answer = generate_answer(
            question,
            [chunk["content"] for chunk in chunks],
            last_updated_dates=[chunk.get("last_updated_date") for chunk in chunks],
        )
        sources = [_chunk_source(chunk) for chunk in chunks]
        return jsonify({"answer": answer, "sources": sources})
    except Exception as error:
        return jsonify({"error": f"Sorunuz yanıtlanırken bir hata oluştu: {error}"}), 500


ALLOWED_AUDIO_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/m4a",
    "audio/ogg",
    "audio/flac",
    "video/webm",
}
MAX_AUDIO_BYTES = 8 * 1024 * 1024


@app.post("/api/transcribe")
def transcribe():
    uploaded = request.files.get("audio")
    if uploaded is None or not uploaded.filename:
        return jsonify({"error": "Ses kaydı bulunamadı. Mikrofona izin verip tekrar deneyin."}), 400

    mime_type = (uploaded.mimetype or "").split(";")[0].strip().lower()
    if mime_type and mime_type not in ALLOWED_AUDIO_TYPES:
        return jsonify({"error": "Bu ses formatı desteklenmiyor. Tarayıcıdan tekrar deneyin."}), 400

    audio_bytes = uploaded.read()
    if not audio_bytes:
        return jsonify({"error": "Ses kaydı boş. Biraz daha uzun konuşup tekrar deneyin."}), 400
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        return jsonify({"error": "Ses kaydı çok uzun. Daha kısa bir soru deneyin."}), 400

    try:
        text = transcribe_audio(
            audio_bytes,
            uploaded.filename or "speech.webm",
            mime_type or "audio/webm",
        )
        if not text:
            return jsonify({"error": "Konuşma anlaşılamadı. Daha net tekrar deneyin."}), 400
        return jsonify({"text": text})
    except Exception as error:
        return jsonify({"error": f"Ses metne çevrilemedi: {error}"}), 500


@app.post("/api/upload-sozlesme")
def upload_contract():
    uploaded = request.files.get("file")
    if uploaded is None or not uploaded.filename:
        return jsonify({"error": "Lütfen bir PDF dosyası yükleyin."}), 400
    if not uploaded.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Yalnızca PDF dosyaları kabul edilir."}), 400

    try:
        pdf_bytes = BytesIO(uploaded.read())
        with pdfplumber.open(pdf_bytes) as pdf:
            pages_text = [page.extract_text() or "" for page in pdf.pages]
        extracted = "\n\n".join(pages_text).strip()
        if not extracted:
            return jsonify(
                {
                    "error": "PDF'den metin çıkarılamadı. "
                    "Dosya taranmış görüntü olabilir; metin katmanı olan bir PDF deneyin."
                }
            ), 400

        connection = get_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO user_documents (filename, extracted_text)
                    VALUES (%s, %s)
                    """,
                    (uploaded.filename, extracted),
                )
            connection.commit()
        finally:
            connection.close()

        page_chunks = []
        for page_number, page_text in enumerate(pages_text, start=1):
            for piece in chunk_text(page_text):
                page_chunks.append((page_number, piece))
                if len(page_chunks) >= MAX_CONTRACT_CHUNKS:
                    break
            if len(page_chunks) >= MAX_CONTRACT_CHUNKS:
                break

        glossary = retrieve_chunks(extracted[:1500], limit=5)
        context = [item["content"] for item in glossary] + [
            f"[Sözleşme parçası | Sayfa {page_number}]\n{piece}"
            for page_number, piece in page_chunks
        ]
        question = (
            "Bu kredi veya kredi kartı sözleşmesinin kritik maddelerini sade Türkçe özetle. "
            "Özellikle şu başlıklara odaklan: faiz oranları, gecikme ve ceza, "
            "erken kapama / iptal şartları, temerrüt, ücret ve masraflar. "
            "Sözleşmede yoksa o başlığı atla."
        )
        answer = generate_answer(
            question,
            context,
            extra_instructions=(
                "Sözleşmede yazmayan hiçbir oran veya ceza uydurma. "
                "Çıktıyı yalnızca '1. **Başlık**: [Standart] açıklama' veya "
                "'1. **Başlık**: [Dikkat] açıklama' maddeleri olarak yaz. "
                "Yüksek ceza/faiz, ağır muacceliyet veya şaşırtıcı şart için [Dikkat] kullan."
            ),
            system_prompt=CONTRACT_SYSTEM_PROMPT,
            last_updated_dates=[item.get("last_updated_date") for item in glossary],
        )
        seen_pages = []
        for page_number, _piece in page_chunks:
            if page_number not in seen_pages:
                seen_pages.append(page_number)
        sources = [
            {
                "source_name": "Sözleşme",
                "source_type": "sozlesme",
                "page_number": page_number,
                "regulation_source": "Banka Sözleşmesi",
                "last_updated_date": None,
                "regulation_reference": None,
            }
            for page_number in seen_pages
        ]
        sources.extend(_chunk_source(item) for item in glossary)
        return jsonify(
            {"answer": answer, "filename": uploaded.filename, "sources": sources}
        )
    except Exception as error:
        return jsonify({"error": f"Sözleşme işlenirken bir hata oluştu: {error}"}), 500


SOURCE_LABELS = {
    "terim_sozlugu": "terim sözlüğü",
    "sozlesme_maddesi": "sözleşme maddesi",
    "tuketici_rehberi": "tüketici rehberi",
    "sozlesme_referans": "sözleşme referansı",
    "kullanici_terim": "sizin eklediğiniz terim",
    "kullanici_belge": "yüklediğiniz belge",
    "kullanici_gorsel": "yüklediğiniz görüntü",
}

MAX_KNOWLEDGE_CHUNKS = 20
MAX_DOC_BYTES = 8 * 1024 * 1024
MAX_IMAGE_BYTES = 4 * 1024 * 1024
ALLOWED_DOC_EXT = {".pdf", ".txt", ".md"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _format_user_term(terim: str, aciklama: str, kategori: str, ornek: str) -> str:
    lines = [
        "[Kaynak: kullanıcı terimi]",
        f"Kategori: {kategori or 'Genel'}",
        f"Terim: {terim}",
        f"Açıklama: {aciklama}",
    ]
    if ornek:
        lines.append(f"Örnek: {ornek}")
    return "\n".join(lines)


@app.get("/api/knowledge/stats")
def knowledge_stats():
    try:
        stats = count_chunks()
        labeled = {
            SOURCE_LABELS.get(key, key): value
            for key, value in stats["by_type"].items()
        }
        return jsonify({"total": stats["total"], "by_type": labeled})
    except Exception as error:
        return jsonify({"error": f"Bilgi tabanı okunamadı: {error}"}), 500


@app.post("/api/knowledge/term")
def add_term():
    payload = request.get_json(silent=True) or {}
    terim = (payload.get("terim") or "").strip()
    aciklama = (payload.get("aciklama") or "").strip()
    kategori = (payload.get("kategori") or "").strip()
    ornek = (payload.get("ornek") or "").strip()
    if not terim or not aciklama:
        return jsonify({"error": "Terim adı ve açıklama zorunlu."}), 400
    if len(terim) > 120 or len(aciklama) > 4000:
        return jsonify({"error": "Terim veya açıklama çok uzun."}), 400

    try:
        content = _format_user_term(terim, aciklama, kategori, ornek)
        inserted = insert_chunks(
            "kullanici_terim",
            [(terim, content)],
            regulation_source="Kullanıcı kaydı",
            last_updated_date=date.today(),
        )
        return jsonify(
            {
                "ok": True,
                "added": inserted,
                "name": terim,
                "message": f"“{terim}” bilgi tabanına eklendi. Sonraki sorularda kullanılacak.",
            }
        )
    except Exception as error:
        return jsonify({"error": f"Terim eklenemedi: {error}"}), 500


def _extract_upload_text(filename: str, data: bytes) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        with pdfplumber.open(BytesIO(data)) as pdf:
            pages_text = [page.extract_text() or "" for page in pdf.pages]
        return "\n\n".join(pages_text).strip()
    if name.endswith(".txt") or name.endswith(".md"):
        return data.decode("utf-8", errors="replace").strip()
    return ""


@app.post("/api/knowledge/document")
def add_document():
    uploaded = request.files.get("file")
    if uploaded is None or not uploaded.filename:
        return jsonify({"error": "Lütfen bir PDF veya metin dosyası seçin."}), 400
    suffix = Path(uploaded.filename).suffix.lower()
    if suffix not in ALLOWED_DOC_EXT:
        return jsonify({"error": "Yalnızca PDF, TXT veya MD dosyaları kabul edilir."}), 400

    raw = uploaded.read()
    if len(raw) > MAX_DOC_BYTES:
        return jsonify({"error": "Dosya çok büyük. 8 MB altı bir dosya deneyin."}), 400

    try:
        extracted = _extract_upload_text(uploaded.filename, raw)
        if not extracted:
            return jsonify(
                {
                    "error": "Dosyadan metin çıkarılamadı. "
                    "Taranmış PDF ise görüntü ekleme ile deneyin."
                }
            ), 400
        chunks = chunk_text(extracted)[:MAX_KNOWLEDGE_CHUNKS]
        rows = [
            (f"{uploaded.filename} #{index + 1}", f"[Kaynak: yüklenen belge]\n{chunk}")
            for index, chunk in enumerate(chunks)
        ]
        inserted = insert_chunks(
            "kullanici_belge",
            rows,
            replace_names=True,
            regulation_source="Kullanıcı belgesi",
            last_updated_date=date.today(),
        )
        return jsonify(
            {
                "ok": True,
                "added": inserted,
                "name": uploaded.filename,
                "message": f"{uploaded.filename} {inserted} parça olarak bilgi tabanına eklendi.",
            }
        )
    except Exception as error:
        return jsonify({"error": f"Belge eklenemedi: {error}"}), 500


@app.post("/api/knowledge/image")
def add_image():
    uploaded = request.files.get("file")
    if uploaded is None or not uploaded.filename:
        return jsonify({"error": "Lütfen bir görüntü seçin."}), 400
    mime_type = (uploaded.mimetype or "").split(";")[0].strip().lower()
    if mime_type not in ALLOWED_IMAGE_TYPES:
        return jsonify({"error": "PNG, JPG veya WEBP görüntü yükleyin."}), 400

    image_bytes = uploaded.read()
    if not image_bytes:
        return jsonify({"error": "Görüntü boş."}), 400
    if len(image_bytes) > MAX_IMAGE_BYTES:
        return jsonify({"error": "Görüntü çok büyük. 4 MB altı bir dosya deneyin."}), 400

    try:
        extracted = extract_text_from_image(image_bytes, mime_type or "image/jpeg")
        if not extracted:
            return jsonify(
                {"error": "Görüntüde okunabilir metin bulunamadı. Daha net bir fotoğraf deneyin."}
            ), 400
        chunks = chunk_text(extracted)[:MAX_KNOWLEDGE_CHUNKS]
        rows = [
            (
                f"{uploaded.filename} #{index + 1}",
                f"[Kaynak: yüklenen görüntü]\n{chunk}",
            )
            for index, chunk in enumerate(chunks)
        ]
        inserted = insert_chunks(
            "kullanici_gorsel",
            rows,
            replace_names=True,
            regulation_source="Kullanıcı belgesi",
            last_updated_date=date.today(),
        )
        preview = extracted[:400] + ("…" if len(extracted) > 400 else "")
        return jsonify(
            {
                "ok": True,
                "added": inserted,
                "name": uploaded.filename,
                "extracted": preview,
                "message": f"{uploaded.filename} okundu ve {inserted} parça eklendi.",
            }
        )
    except Exception as error:
        return jsonify({"error": f"Görüntü işlenemedi: {error}"}), 500


@app.after_request
def disable_cache_in_debug(response):
    if app.debug:
        response.headers["Cache-Control"] = "no-store, max-age=0"
    return response


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)

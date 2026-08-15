from io import BytesIO
from datetime import date
from pathlib import Path
import json
import re

import pdfplumber
from flask import Flask, jsonify, make_response, redirect, render_template, request, send_from_directory

from config import (
    CONTRACT_MAX_CHUNKS_PER_DOC,
    CONTRACT_MAX_FILES,
    SECRET_KEY,
)
from db import get_connection
from rag.chunking import chunk_text
from rag.embeddings import embed_texts
from rag.llm_client import (
    CONTRACT_SYSTEM_PROMPT,
    CONTRACT_SYSTEM_PROMPT_EN,
    extract_text_from_image,
    generate_answer,
    transcribe_audio,
)
from rag.retrieval import retrieve_chunks
from rag.reranker import warmup_reranker
from rag.session_store import (
    append_history,
    new_session_id,
    put_docs,
    session_chunks,
    session_docs,
    session_history,
)
from rag.store import count_chunks, ensure_regulation_columns, insert_chunks, list_glossary

from modules.revenue_engine.api import revenue_bp

PAGES_DIR = Path(__file__).resolve().parent / "pages"
MAX_CONTRACT_CHUNKS = CONTRACT_MAX_CHUNKS_PER_DOC
SID_COOKIE = "fc_sid"

app = Flask(
    __name__,
    static_folder=str(PAGES_DIR),
    static_url_path="",
    template_folder=str(PAGES_DIR),
)
app.secret_key = SECRET_KEY
app.register_blueprint(revenue_bp)
try:
    ensure_regulation_columns()
except Exception:
    pass
try:
    warmup_reranker()
except Exception:
    pass


def request_lang(payload=None) -> str:
    raw = ""
    if isinstance(payload, dict):
        raw = str(payload.get("lang") or "")
    if not raw:
        raw = str(request.form.get("lang") or request.args.get("lang") or "")
    return "en" if raw.strip().lower().startswith("en") else "tr"


def _snippet(text: str, limit: int = 420) -> str:
    snippet = " ".join((text or "").split())
    if len(snippet) <= limit:
        return snippet
    return snippet[:limit].rstrip() + "…"


def _chunk_source(chunk: dict) -> dict:
    return {
        "source_name": chunk.get("source_name"),
        "source_type": chunk.get("source_type"),
        "page_number": chunk.get("page_number"),
        "regulation_source": chunk.get("regulation_source"),
        "last_updated_date": chunk.get("last_updated_date"),
        "regulation_reference": chunk.get("regulation_reference"),
        "snippet": _snippet(chunk.get("content") or ""),
    }


def _session_id() -> str:
    return (request.cookies.get(SID_COOKIE) or "").strip() or new_session_id()


def _json_with_sid(payload: dict, session_id: str, status: int = 200):
    response = jsonify(payload)
    response.status_code = status
    response.set_cookie(
        SID_COOKIE,
        session_id,
        httponly=True,
        samesite="Lax",
        max_age=30 * 60,
    )
    return response


def _privacy_note(lang: str) -> str:
    if lang == "en":
        return "Uploaded documents are not stored permanently; they are deleted at the end of the session."
    return "Yüklediğiniz belgeler kalıcı olarak saklanmaz, oturum sonunda silinir."


def _extract_pdf(uploaded) -> tuple[str, list[str]]:
    filename = uploaded.filename or "sozlesme.pdf"
    pdf_bytes = BytesIO(uploaded.read())
    with pdfplumber.open(pdf_bytes) as pdf:
        pages_text = [page.extract_text() or "" for page in pdf.pages]
    return filename, pages_text


def _chunk_pages(pages_text: list[str], filename: str, doc_index: int) -> list[dict]:
    chunks = []
    for page_number, page_text in enumerate(pages_text, start=1):
        for piece in chunk_text(page_text):
            chunks.append(
                {
                    "content": piece,
                    "page_number": page_number,
                    "source_name": filename,
                    "source_type": "sozlesme",
                    "doc_index": doc_index,
                    "doc_name": filename,
                    "regulation_source": filename,
                    "last_updated_date": None,
                    "regulation_reference": None,
                }
            )
            if len(chunks) >= MAX_CONTRACT_CHUNKS:
                return chunks
    return chunks


def _parse_json_payload(text: str):
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}|\[[\s\S]*\]", raw)
        if not match:
            return None
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None


def render_page(template_name: str, **context):
    response = make_response(render_template(template_name, **context))
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/")
def index():
    return render_page("index.html", active="home")


@app.get("/bilgi")
def knowledge_page():
    return render_page("knowledge.html", active="kb")


@app.get("/nasil-calisir")
def how_page():
    return render_page("how.html", active="how")


@app.get("/sozluk")
def glossary_page():
    return render_page("glossary.html", active="glossary")


@app.get("/karsilastir")
def compare_page():
    return render_page("compare.html", active="compare")


@app.get("/dashboard/revenue-splits")
def revenue_splits_page():
    return redirect("/sozluk", code=302)


@app.post("/api/ask")
def ask():
    payload = request.get_json(silent=True) or {}
    lang = request_lang(payload)
    question = (payload.get("question") or "").strip()
    if not question:
        error = (
            "Please enter a question or a short text."
            if lang == "en"
            else "Lütfen bir soru veya metin yazın."
        )
        return jsonify({"error": error}), 400

    try:
        chunks = retrieve_chunks(question, limit=3)
        if not chunks:
            error = (
                "No matching records in the knowledge base. Run python scripts/ingest_data.py first."
                if lang == "en"
                else "Bilgi tabanında ilgili kayıt bulunamadı. "
                "Önce python scripts/ingest_data.py komutunu çalıştırın."
            )
            return jsonify({"error": error}), 404

        answer = generate_answer(
            question,
            [chunk["content"] for chunk in chunks],
            last_updated_dates=[chunk.get("last_updated_date") for chunk in chunks],
            language=lang,
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
            language=request_lang(),
        )
        if not text:
            return jsonify({"error": "Konuşma anlaşılamadı. Daha net tekrar deneyin."}), 400
        return jsonify({"text": text})
    except Exception as error:
        return jsonify({"error": f"Ses metne çevrilemedi: {error}"}), 500


@app.post("/api/upload-sozlesme")
def upload_contract():
    uploads = request.files.getlist("file") or []
    uploads = [item for item in uploads if item and item.filename]
    lang = request_lang()
    if not uploads:
        error = (
            "Please upload a PDF file."
            if lang == "en"
            else "Lütfen bir PDF dosyası yükleyin."
        )
        return jsonify({"error": error}), 400
    if len(uploads) > CONTRACT_MAX_FILES:
        error = (
            f"Please choose at most {CONTRACT_MAX_FILES} PDF files."
            if lang == "en"
            else f"En fazla {CONTRACT_MAX_FILES} PDF seçin."
        )
        return jsonify({"error": error}), 400
    for uploaded in uploads:
        if not uploaded.filename.lower().endswith(".pdf"):
            error = (
                "Only PDF files are accepted."
                if lang == "en"
                else "Yalnızca PDF dosyaları kabul edilir."
            )
            return jsonify({"error": error}), 400

    session_id = _session_id()
    try:
        docs = []
        for doc_index, uploaded in enumerate(uploads):
            filename, pages_text = _extract_pdf(uploaded)
            extracted = "\n\n".join(pages_text).strip()
            if not extracted:
                error = (
                    f"No text could be extracted from {filename}."
                    if lang == "en"
                    else f"{filename} dosyasından metin çıkarılamadı."
                )
                return jsonify({"error": error}), 400
            chunks = _chunk_pages(pages_text, filename, doc_index)
            vectors = embed_texts([item["content"] for item in chunks])
            for chunk, vector in zip(chunks, vectors):
                chunk["embedding"] = vector
            docs.append(
                {
                    "filename": filename,
                    "doc_index": doc_index,
                    "chunks": chunks,
                }
            )
        put_docs(session_id, docs)
        names = [doc["filename"] for doc in docs]
        skip_summary = str(request.form.get("skip_summary") or "").lower() in {
            "1",
            "true",
            "yes",
        }
        if skip_summary:
            return _json_with_sid(
                {
                    "filename": names[0],
                    "filenames": names,
                    "doc_count": len(docs),
                    "privacy": _privacy_note(lang),
                    "sources": [],
                },
                session_id,
            )

        all_chunks = [chunk for doc in docs for chunk in doc["chunks"]]
        preview = " ".join(chunk["content"] for chunk in all_chunks)[:1500]
        glossary = retrieve_chunks(preview, limit=5) if preview else []
        context = [item["content"] for item in glossary] + [
            f"[Dosya: {chunk['source_name']} | Sayfa {chunk['page_number']}]\n{chunk['content']}"
            for chunk in all_chunks
        ]
        if lang == "en":
            question = (
                "Summarise the critical clauses of "
                + ("these contracts" if len(docs) > 1 else "this loan or credit-card contract")
                + " in plain English. "
                "Focus on interest rates, late fees and penalties, early termination / cancellation, "
                "minimum payment, default, and fees. Skip a heading if it is not in the contract."
            )
            extra = (
                "Do not invent any rate or penalty that is not written in the contract. "
                "Write only items as '1. **Title**: [Standard] explanation' or "
                "'1. **Title**: [Attention] explanation'. "
                "Use [Attention] for high penalties/interest, harsh acceleration, or surprising terms."
            )
            contract_prompt = CONTRACT_SYSTEM_PROMPT_EN
        else:
            question = (
                "Bu kredi veya kredi kartı sözleşmesinin kritik maddelerini sade Türkçe özetle. "
                "Özellikle şu başlıklara odaklan: faiz oranları, gecikme ve ceza, "
                "erken kapama / iptal şartları, asgari ödeme, temerrüt, ücret ve masraflar. "
                "Sözleşmede yoksa o başlığı atla."
            )
            extra = (
                "Sözleşmede yazmayan hiçbir oran veya ceza uydurma. "
                "Çıktıyı yalnızca '1. **Başlık**: [Standart] açıklama' veya "
                "'1. **Başlık**: [Dikkat] açıklama' maddeleri olarak yaz. "
                "Yüksek ceza/faiz, ağır muacceliyet veya şaşırtıcı şart için [Dikkat] kullan."
            )
            contract_prompt = CONTRACT_SYSTEM_PROMPT
        answer = generate_answer(
            question,
            context,
            extra_instructions=extra,
            system_prompt=contract_prompt,
            last_updated_dates=[item.get("last_updated_date") for item in glossary],
            language=lang,
        )
        sources = [_chunk_source(chunk) for chunk in all_chunks]
        sources.extend(_chunk_source(item) for item in glossary)
        return _json_with_sid(
            {
                "answer": answer,
                "filename": names[0],
                "filenames": names,
                "doc_count": len(docs),
                "privacy": _privacy_note(lang),
                "sources": sources,
            },
            session_id,
        )
    except Exception as error:
        return jsonify({"error": f"Sözleşme işlenirken bir hata oluştu: {error}"}), 500


@app.post("/api/contract/compare")
def compare_contracts():
    lang = request_lang(request.get_json(silent=True) or {})
    session_id = _session_id()
    docs = session_docs(session_id)
    if len(docs) < 2:
        error = (
            "Upload at least two PDFs to compare."
            if lang == "en"
            else "Karşılaştırmak için en az iki PDF yükleyin."
        )
        return jsonify({"error": error}), 400
    try:
        names = [doc["filename"] for doc in docs]
        context_parts = []
        for doc in docs:
            labeled = "\n".join(
                f"[Sayfa {chunk['page_number']}] {chunk['content']}"
                for chunk in doc.get("chunks") or []
            )
            context_parts.append(f"=== {doc['filename']} ===\n{labeled}")
        if lang == "en":
            question = (
                "Compare these credit-card or loan contracts on interest rate, penalties, "
                "minimum payment, and cancellation / early-termination terms."
            )
            extra = (
                "Return ONLY valid JSON: "
                '{"rows":[{"title":"...","values":["doc1 text","doc2 text"],"winner":"filename or Tie"}]}. '
                "values must have one string per document, in this order: "
                + ", ".join(names)
                + ". winner is the document filename that is better for the customer, or Tie. "
                "If a point is missing, say it is not in the text. Do not invent numbers."
            )
            system = (
                "You compare consumer credit contracts. Use only the given text. "
                "Reply with JSON only, no markdown."
            )
        else:
            question = (
                "Bu kredi kartı veya kredi sözleşmelerini faiz oranı, ceza, asgari ödeme "
                "ve iptal / erken kapama şartları üzerinden karşılaştır."
            )
            extra = (
                "Yalnızca geçerli JSON döndür: "
                '{"rows":[{"title":"...","values":["belge1 metin","belge2 metin"],"winner":"dosya adı veya Eşit"}]}. '
                "values dizisi belgelerle aynı sırada olsun: "
                + ", ".join(names)
                + ". winner, tüketici için daha avantajlı belgenin dosya adı veya Eşit olsun. "
                "Metinde yoksa uydurma, 'metinde yok' yaz."
            )
            system = (
                "Tüketici kredi sözleşmelerini karşılaştırırsın. Yalnızca verilen metni kullan. "
                "Sadece JSON yaz, markdown kullanma."
            )
        raw = generate_answer(
            question,
            context_parts,
            extra_instructions=extra,
            system_prompt=system,
            language=lang,
        )
        parsed = _parse_json_payload(raw) or {}
        rows = parsed.get("rows") if isinstance(parsed, dict) else parsed
        if not isinstance(rows, list):
            rows = []
        clean = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            values = row.get("values") or []
            if not isinstance(values, list):
                values = []
            while len(values) < len(names):
                values.append("")
            clean.append(
                {
                    "title": str(row.get("title") or ""),
                    "values": [str(item) for item in values[: len(names)]],
                    "winner": str(row.get("winner") or ""),
                }
            )
        return _json_with_sid(
            {
                "filenames": names,
                "rows": clean,
                "privacy": _privacy_note(lang),
            },
            session_id,
        )
    except Exception as error:
        return jsonify({"error": f"Karşılaştırma yapılamadı: {error}"}), 500


@app.post("/api/contract/ask")
def contract_ask():
    payload = request.get_json(silent=True) or {}
    lang = request_lang(payload)
    question = (payload.get("question") or "").strip()
    if not question:
        error = (
            "Please enter a question."
            if lang == "en"
            else "Lütfen bir soru yazın."
        )
        return jsonify({"error": error}), 400
    session_id = _session_id()
    corpus = session_chunks(session_id)
    if not corpus:
        error = (
            "Upload a contract PDF first."
            if lang == "en"
            else "Önce bir sözleşme PDF'i yükleyin."
        )
        return jsonify({"error": error}), 400
    try:
        chunks = retrieve_chunks(question, limit=3, corpus=corpus)
        context = [
            f"[Dosya: {chunk.get('source_name')} | Sayfa {chunk.get('page_number')}]\n{chunk.get('content')}"
            for chunk in chunks
        ]
        if lang == "en":
            system = (
                "You answer questions only from the uploaded contract excerpts. "
                "Do not use outside knowledge. If it is not in the excerpts, say so. "
                "End with a source line like 'Source: [filename - Page 4]'."
            )
        else:
            system = (
                "Yalnızca yüklenen sözleşme parçalarına bakarak cevap ver. "
                "Genel bilgi tabanını veya dış bilgiyi kullanma. Parçada yoksa 'bağlamda yok' de. "
                "Cevabın sonunda 'Kaynak: [dosya adı - Sayfa 4]' satırı olsun."
            )
        answer = generate_answer(
            question,
            context,
            system_prompt=system,
            language=lang,
            history=session_history(session_id),
        )
        append_history(session_id, question, answer)
        return _json_with_sid(
            {
                "answer": answer,
                "sources": [_chunk_source(chunk) for chunk in chunks],
                "privacy": _privacy_note(lang),
            },
            session_id,
        )
    except Exception as error:
        return jsonify({"error": f"Soru yanıtlanamadı: {error}"}), 500


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


GLOSSARY_KINDS = {
    "all": None,
    "terms": ("terim_sozlugu", "kullanici_terim"),
    "clauses": ("sozlesme_maddesi",),
    "guide": ("tuketici_rehberi",),
}


@app.get("/api/glossary")
def glossary():
    kind = (request.args.get("kind") or "all").strip().lower()
    query = (request.args.get("q") or "").strip()
    types = GLOSSARY_KINDS.get(kind, GLOSSARY_KINDS["all"])
    try:
        items = list_glossary(query=query, source_types=types, limit=200)
        return jsonify({"items": items, "count": len(items)})
    except Exception as error:
        print(f"glossary: {error}")
        message = (
            "The glossary hasn’t loaded yet. Please try again in a moment."
            if request_lang() == "en"
            else "Sözlük henüz yüklenmedi, birazdan tekrar deneyin."
        )
        return jsonify({"error": message}), 500


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

# FinÇevirmen — Proje Spesifikasyonu

## 1. Proje Özeti

**İsim:** FinÇevirmen
**Amaç:** Finansal terimleri ve kredi/kredi kartı sözleşmelerini kullanıcının
anlayacağı sade Türkçeye "çeviren" bir RAG (Retrieval-Augmented Generation)
web uygulaması.

**İki temel özellik:**
1. **Terim Çevirmeni:** Kullanıcı bir bilanço/rapor metni ya da terim
   yapıştırır → sistem sade Türkçe açıklar.
2. **Sözleşme Çözümleyici:** Kullanıcı bir sözleşme PDF'i yükler → sistem
   kritik maddeleri (ceza, faiz, iptal şartları) bulup özetler.

## 2. Teknoloji Yığını (Stack)

- **Backend:** Python + Flask (`app.py` içinde tüm route'lar)
- **Veritabanı:** Neon (serverless Postgres) + pgvector
- **Embedding modeli:** Yerel `sentence-transformers` —
  `paraphrase-multilingual-MiniLM-L12-v2` (384 boyut)
- **LLM:** Groq API, varsayılan model `llama-3.3-70b-versatile`
  (`rag/llm_client.py` soyutlanmış; sağlayıcı `.env` ile seçilir)
- **Frontend:** HTML/CSS/JS (Flask aynı sunucudan servis eder)
- **PDF işleme:** `pdfplumber`

## 3. Veritabanı Şeması (Neon / Postgres)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_chunks (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL,
    source_name VARCHAR(255),
    content TEXT NOT NULL,
    embedding VECTOR(384),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_documents (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255),
    extracted_text TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON knowledge_chunks
USING hnsw (embedding vector_cosine_ops);
```

Küçük veri setinde IVFFlat yerine HNSW kullanılır.

## 4. Klasör Yapısı

```
FinÇevirmen/
├── app.py
├── requirements.txt
├── .env
├── .gitignore
├── config.py
├── db.py
├── rag/
│   ├── chunking.py
│   ├── embeddings.py
│   ├── retrieval.py
│   └── llm_client.py
├── data/
│   └── terim_sozlugu.json
├── scripts/
│   ├── init_db.py
│   ├── ingest_data.py
│   └── create_sample_pdf.py
└── pages/
    ├── index.html
    ├── style.css
    └── script.js
```

## 5. Ortam Değişkenleri

`.env` dosyasına yazılacak (git'e eklenmez):

- `NEON_DATABASE_URL`
- `GROQ_API_KEY`
- `LLM_PROVIDER=groq`
- `LLM_MODEL=llama-3.3-70b-versatile`
- `EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2`

## 6. Çalıştırma Sırası

```bash
cd "/Users/nursenakay/Desktop/FinÇevirmen"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

`.env` içine gerçek Neon ve Groq değerlerini yazdıktan sonra:

```bash
python db.py
python scripts/init_db.py
python scripts/ingest_data.py
python scripts/create_sample_pdf.py
python app.py
```

Tarayıcı: http://127.0.0.1:5000

## 7. Kurallar

- Kod değişken adları İngilizce; kullanıcıya görünen tüm metinler Türkçe.
- Gizli bilgiler koda gömülmez; `.env` `.gitignore` içindedir.

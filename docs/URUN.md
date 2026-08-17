# FinÇevirmen — Ürün dokümantasyonu

Bu belge projeyi baştan sona anlatır: amaç, giderilen açık, hedef kitle,
çalışma adımları, arka plan mimarisi, seçilen RAG türü ve MCP.

Teknik ayrıntı için ayrıca:

- [RAG.md](RAG.md) — retrieve-then-rerank
- [MCP.md](MCP.md) — ajan bağlantısı

---

## 1. Proje nedir?

**FinÇevirmen**, banka ve kredi dilini sade Türkçeye çeviren bir **RegTech**
web uygulamasıdır. Genel sohbet asistanı değildir. Model eğitilmez. Cevap,
önceden indekslenmiş sözlük, tüketici rehberi ve resmi mevzuat parçalarına
dayanır.

Kapsam:

- Kredi kartı ve tüketici kredisi jargonu
- Sözleşme maddeleri (faiz, ceza, aidat, cayma, masraf)
- 6502 sayılı Tüketicinin Korunması Hakkında Kanun
- TCMB Finansal Tüketicilerden Alınacak Ücretler Tebliği (2020/7)

Kapsam dışı:

- Hisse, döviz, teknik analiz, haber veya blog üretimi
- Avukat yerine geçmek; dilekçe **taslaktır**, hukuki tavsiye değildir

---

## 2. Amaç nedir?

Kullanıcı “asgari ödeme”, “temerrüt”, “tahsis ücreti”, “cayma hakkı” gibi
ifadeleri veya onlarca sayfalık banka PDF’ini okuduğunda **ne demek
istediğini** ve **hangi resmi kurala dayandığını** görsün.

Üç çıktı beklenir:

1. Günlük dille açıklama
2. Varsa madde referansı (`📌 Yasal Dayanak`)
3. Sözleşmede tuzak olabilecek maddede `[Dikkat]` uyarısı

---

## 3. Hangi açığı giderir?

Türkiye’de tüketici, banka metnini çoğu zaman avukatsız okur. Karşılaştığı
üç boşluk:

| Açık | Ne olur | FinÇevirmen ne yapar |
|---|---|---|
| Dil boşluğu | Sözleşme ve ekstre hukuki / bankacılık dilinde | Terimi ve maddeyi sade Türkçeye çevirir |
| Kaynak boşluğu | Arama motoru blog, forum, eski yazı getirir | Yalnızca indeksteki sözlük ve resmi metne bakar |
| Uydurma boşluğu | Genel yapay zeka madde numarası veya faiz tavanı uydurabilir | Bağlamda yoksa “bağlamda yok” der; madde uydurmaz |
| Risk boşluğu | Kullanıcı aleyhte maddeyi atlar | `[Standart]` / `[Dikkat]` etiketler; iki PDF’i kıyaslar |
| Belge boşluğu | Yüklenen sözleşme kalıcı arşivlenebilir kaygısı | Oturum belleğinde tutulur, süre bitince silinir |

Özet: **anlam + kanıt + tuzak uyarısı**, ezberlenmiş genel bilgi değil.

---

## 4. Kim kullansın? Hedef kitle kim?

Birincil kitle, Türkiye’de bankayla muhatap olan **bireysel tüketici**:

- İlk kez kredi kartı veya ihtiyaç / konut kredisi alanlar
- Ekstresinde aidat, masraf, asgari ödeme görenler
- Sözleşmeyi imzalamadan önce “bu madde ne demek” diye soranlar
- İki banka teklifini yan yana karşılaştırmak isteyenler
- Tüketici hakem heyetine dilekçe **taslağı** hazırlamak isteyenler

İkincil kitle:

- Öğrenci ve stajyer (finansal okuryazarlık)
- Şube / çağrı merkezi çalışanı (iç jargonu müşteri diline çevirmek)
- Ürünü kendi terimleriyle zenginleştiren kişi (bilgi tabanı)

Birincil kitle **yatırımcı, trader veya hukuk bürosu** değildir. Borsa verisi
yoktur. Avukatın yerini almaz.

---

## 5. Kullanıcıya ne sunar? (ürün yüzeyi)

| Sayfa / özellik | Ne işe yarar |
|---|---|
| Ana sayfa — terim çevirmeni | Yazılı veya sesli soru; sözlük + mevzuat ile açıklama |
| Sözleşme çözümleyici | PDF yükle; faiz, ceza, iptal maddeleri `[Standart]` / `[Dikkat]` |
| Ekstre / dekont tara | Görüntü veya PDF’den ücret kalemlerini oku |
| Karşılaştır | İki sözleşmeyi yan yana tabloya dök; PDF / paylaşım |
| Dilekçe taslağı | Aidat, masraf veya cayma; Kaymakamlık THH formatı |
| Sözlük | İndeksteki terimleri gez |
| Bilgi tabanı | Kullanıcının terim / belge / görüntüsünü indekse ekle |
| Nasıl çalışır | Ürün anlatımı |

Web adresi (yerel): `http://127.0.0.1:5000`

---

## 6. Adım adım nasıl çalışır?

Kullanıcı tarafı üç adımdır. Arka plan her adımda aynı kuralı uygular:
**önce kaynak, sonra cümle.**

### Adım 1 — Girdi

Kullanıcı şunlardan birini verir:

- Soru veya terim (klavye veya mikrofon)
- Kredi / kart sözleşmesi PDF
- Ekstre veya dekont
- İki PDF (kıyas)
- Dilekçe için banka, il / ilçe, konu

Yüklenen belgeler kalıcı tabloya yazılmaz. Bellekte oturum kaydı açılır
(yaklaşık 30 dakika). Süre dolunca silinir.

### Adım 2 — Arama (RAG)

1. Metin parçalanır (sözleşme) veya soru olduğu gibi alınır.
2. Yerel gömme modeli metni 384 boyutlu vektöre çevirir.
3. Neon Postgres + pgvector, cosine uzaklığıyla en yakın ~10 parçayı getirir.
4. Aidat, cayma, masraf gibi konularda mevzuat parçaları ekstra güçlendirilir.
5. Cross-encoder adayları puanlar; **en fazla 3 parça** kalır.
6. Mevzuat gerekip de ilk sırada yoksa bir kanun parçası enjekte edilir.

Bu aşamada dil modeli henüz “fikir yürütmez”; sadece aday metin seçilir.

### Adım 3 — Cevap

Groq, sistem yönergesiyle yalnızca o 3 parçaya bakarak yazar:

- Kısa, numaralı, günlük dil
- Bağlamda yoksa uydurmaz
- Mevzuat varsa son satır: `📌 Yasal Dayanak` + indeksteki kanun ve madde
- Sözleşmede beklenen madde `[Standart]`, aleyhte olabilecek `[Dikkat]`

Kaynak listesi cevabın altında görünür.

---

## 7. Arka planda hangi mimari çalışır?

Ürün mimarisi **tek süreçli web uygulaması + retrieve-then-rerank RAG**’tir.
Mikroservis ağı veya ürün içi ajan döngüsü yoktur (nedeni ve nasıl
ekleneceği: [AGENT.md](AGENT.md)). MCP vardır; dış ajan aynı motoru çağırır.

```text
Tarayıcı (HTML / CSS / JS)
        │
        ▼
Flask (app.py)  ────────────────────────────┐
        │                                   │
        ├─ rag/pipeline.py  (soru-cevap)    │ aynı motor
        ├─ rag/retrieval.py (arama)         │
        ├─ rag/reranker.py                  │
        ├─ rag/llm_client.py (Groq)         │
        └─ rag/session_store.py (oturum PDF)│
                                            │
Neon pgvector  ← yerel embedding 384-d      │
                                            │
mcp_server.py  ─────────────────────────────┘
        ▲
   Cursor ajanı (isteğe bağlı)
```

| Katman | Teknoloji | Görev |
|---|---|---|
| Arayüz | Vanilla HTML, CSS, JS (React/Next yok) | Sayfalar `pages/` |
| Uygulama | Python, Flask | Rotalar `app.py` |
| Bilgi deposu | Neon Postgres, pgvector, HNSW | `knowledge_chunks` |
| Gömme | Yerel, 384-d, çok dilli MiniLM | Soru ve parça aynı uzay |
| Rerank | Cross-encoder MiniLM | 10 aday → 3 |
| Dil modeli | Groq (varsayılan `openai/gpt-oss-120b`) | Yalnızca bağlam |
| PDF | pdfplumber | Metin çıkarma |
| Oturum | Bellek içi sözlük, ~30 dk | Sözleşme PDF’leri |
| Ajan protokolü | MCP stdio | Aynı pipeline’ı araç yapar |

Gizli anahtarlar `.env` içindedir; git’e girmez.

---

## 8. Hangi RAG türü? Neden bu?

**Kullanılan tür: retrieve-then-rerank (iki aşamalı yoğun RAG).**

Yoğun = anlam vektörüyle arama. İki aşama = önce çok aday, sonra çapraz
kodlayıcı ile sıkı eleme. Üretim tek turdur; model “bir daha ara” diye
döngüye girmez.

### Neden bu?

1. **Külliyat küçük ve temizdir.** Sözlük + rehber + madde bazlı kanun
   parçaları. Graf veya tam metin arama motoru gerektirmez.
2. **Asıl risk uydurulan maddedir.** Üç parça + zorunlu kaynak satırı bunu
   sınırlar. Ajanın ikinci turda “tamamlarım” demesi tehlikelidir.
3. **Gecikme.** Kullanıcı soru yazıp bekler. Tek retrieve, tek rerank, tek
   üretim yeter.
4. **Denetlenebilirlik.** Hangi parçanın geldiği, hangi maddenin basıldığı
   loglanabilir ve arayüzde gösterilir.

### Neyi bilerek kullanmıyoruz?

| Tür | Durum | Neden tercih edilmedi |
|---|---|---|
| Hybrid BM25 + RRF | Yok | Kelime tarafı `ILIKE` ve mevzuat boost ile karşılanıyor |
| GraphRAG | Yok | Soru “hangi madde”, “kim kime bağlı” değil |
| Agentic RAG | Yok | Ekstra tur = uydurma, maliyet, yavaşlık |

Bunlar kötü teknoloji değildir. Bu ürünün verisine ve “uydurma” kısıtına
uymaz. Külliyat çok büyürse hybrid; çapraz madde atıfı ürün şartı olursa
graf ayrıca değerlendirilir. Varsayılan değişmez.

---

## 9. MCP var mı?

**Var.** RAG’in yerine geçmez; aynı motoru Cursor ajanına açar.

| Soru | Cevap |
|---|---|
| MCP bu projede var mı? | Evet, `mcp_server.py` |
| RAG’i iptal eder mi? | Hayır. Web ve MCP `rag/pipeline.py` paylaşır |
| Nasıl bağlanır? | Yalnızca [`.cursor/mcp.json`](../.cursor/mcp.json) |
| Başka ürün sunucusu var mı? | Hayır. Bu JSON’da yalnızca `fincevirmen` vardır |

Araçlar: `retrieve`, `ask`, `draft_consumer_petition`, `knowledge_stats`.

Kurulum ve sınırlar: [MCP.md](MCP.md).

---

## 10. Güven ve sınırlar

- Cevap hukuki mütalaa değildir.
- Dilekçe imzalanmadan önce Resmî Gazete metni kontrol edilmelidir.
- 365 günden eski indekste sabit güncellik uyarısı çıkar.
- Oturumluk belgeler kalıcı `knowledge_chunks` tablosuna yazılmaz; bilgi
  tabanına **bilinçle** eklenen terim ve belgeler yazılır.
- Faiz tavanı, vergi oranı, madde numarası bağlamda yoksa üretilmez.

---

## 11. Yerelde çalıştırma

```bash
./venv/bin/python scripts/init_db.py
./venv/bin/python scripts/ingest_data.py
./venv/bin/python scripts/ingest_laws.py
./venv/bin/python app.py
```

Tarayıcı: http://127.0.0.1:5000

`.env` içinde `NEON_DATABASE_URL` ve `GROQ_API_KEY` gerekir. Örnek:
`.env.example`.

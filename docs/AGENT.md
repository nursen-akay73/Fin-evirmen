# Mikroservis yok, ajan döngüsü yok — neden ve nasıl eklenir

FinÇevirmen bugün **tek Flask süreci** ve **tek geçişli RAG** ile çalışır.
Bu eksiklik değil; ürün kısıtına göre bilinçli sadeleştirmedir.

İki ayrı karar vardır. Karıştırılmamalıdır:

| Karar | Bugün | Anlamı |
|---|---|---|
| Mikroservis yok | Flask + Neon + Groq aynı üründe | Dağıtık servis ağı yok |
| Ürün içi ajan döngüsü yok | Retrieve → rerank → tek cevap | Model “bir daha ara / internete çık” demez |
| MCP var | `mcp_server.py` | Cursor gibi **dış ajan** aynı motoru araç olarak çağırır |

MCP bir ajan **çalıştırmaz**. Ajan protokolüdür. Döngüyü Cursor (veya başka
bir istemci) kurar; FinÇevirmen yalnızca `retrieve` / `ask` sunar.

---

## 1. Neden mikroservis yok?

Mikroservis, bağımsız ekiplerin bağımsız ölçeklediği birden fazla hizmet
içindir (kimlik, ödeme, arama, bildirim ayrı deploy).

Bu üründe:

- Tek ekip, tek külliyat, tek veritabanı
- Gecikme bütçesi bir kullanıcı sorusudur; ağ hop’u kazanç getirmez
- Hata ayıklama “hangi serviste madde kayboldu” olmamalıdır
- Neon ve Groq zaten dış hizmettir; onları sarmalayan ince Flask yeter

Ne zaman düşünülür: gömme / rerank CPU’su web’i tıkarsa, veya indeksi ayrı
bir arama kümesi olarak ölçeklemek gerekirse. O zaman ilk ayrılacak parça
`rag/` olur; “on mikroservis” değil.

---

## 2. Neden ürün içinde ajan döngüsü yok?

**Ajan döngüsü (agent loop):** model düşünür → araç seçer → sonuç okur →
yine araç → ta ki “bitti” desin.

**Agentic RAG:** bu döngünün arama özel hali. İlk retrieve yetmezse model
yeni sorgu yazar, tekrar arar, bazen web’e çıkar, sonra cevaplar.

FinÇevirmen’de asıl risk yanlış **madde numarası**dır. Döngü tam burada
bozulur: ikinci turda bağlam inceyse model “Madde 31 herhalde” diye
parametrik bilgiden doldurur. Tüketici bunu resmi sanır.

Ayrıca her tur Groq çağrısı = yavaş ve pahalı. Web kullanıcısı bir kutu
doldurup bekler; araştırma asistanı değildir.

Bu yüzden varsayılan: **tek retrieve, tek rerank, tek üretim.**
Eksikse “bağlamda yok” denir; tamamlanmaz.

---

## 3. “Ajan” zaten nerede var?

Üç katman vardır:

```text
1) Web kullanıcısı
   tarayıcı → Flask → retrieve-then-rerank → cevap
   (döngü yok)

2) Dış ajan (Cursor)
   model → MCP tool (retrieve / ask / dilekçe) → FinÇevirmen RAG
   (döngü Cursor’dadır; araçlar bu repodadır)

3) Ürün içi ajan  —  YOK
   Flask’ın kendi “planla, tekrar ara, web aç” döngüsü
```

Yani “ajan yok” demek MCP yok demek değildir. **Ürün, kendi başına ajan
değildir.** İsteyen istemci ajan olur; külliyat ve kurallar burada kalır.

---

## 4. Agentic RAG nedir, bu ürüne uyar mı?

Klasik agentic RAG:

1. Soruyu parçala (plan)
2. `retrieve(sorgu_1)`
3. “Yeterli mi?” diye değerlendir
4. Değilse `retrieve(sorgu_2)` veya başka araç
5. Parçaları birleştir, cevap yaz

Uyar **yalnızca şu kurallarla**:

- İkinci arama **aynı Neon indeksinden** olur. Web, başka külliyat, ezber yok.
- En fazla **bir** ekstra retrieve (toplam 2 tur). Sonsuz döngü yok.
- Yeni turda gelen parçada `regulation_reference` yoksa madde yazılmaz.
- “Eksik maddeyi tahmin et” yasak; çıktı “indekste yok”.
- Dilekçe şablona bağlı kalır; ajan madde uydurarak dilekçe doldurmaz.
- Web `/api/ask` varsayılanı tek geçiş kalır. Agentic ayrı kapı olur
  (`/api/ask-agentic` veya MCP aracı `ask_iterative`).

Bu şartlar yoksa agentic RAG bu ürün için uygun değildir.

---

## 5. Nasıl bir ajan eklenir? (tasarım, henüz kod yok)

Sıra bu olmalıdır. Tersine (önce serbest ReAct) gidilmez.

### Adım A — Araç listesini kilitle

Ajanın görebileceği tek araçlar mevcut MCP yüzeyi:

- `retrieve(question)` — LLM yok, sadece parçalar
- `ask(question)` — tek geçişli grounded cevap
- `draft_consumer_petition(...)` — şablon
- `knowledge_stats()` — sayım

İnternet araması, genel sohbet, başka indeksler yok.

### Adım B — İnce orkestratör (isteğe bağlı, ürün içi)

Groq’a function calling açılır. Sistem yönergesi:

> Yalnızca retrieve çağır. En fazla iki retrieve. Cevabı yalnızca dönen
> parçalardan yaz. Parçada olmayan madde numarasını yazma.

Sözde kod:

```text
parçalar = retrieve(soru)
eğer mevzuat_sorusu ve parçalarda kanun yok:
    parçalar += retrieve(mevzuat_boost_sorgusu)   # zaten retrieval.py'de var
cevap = generate(yalnızca parçalar)
dur
```

Dikkat: aidat / cayma / masraf için **mevzuat boost zaten var**
(`rag/retrieval.py`). Birçok “ikinci arama” ihtiyacı kodla çözülmüştür;
modele bırakılmaz.

### Adım C — Dış ajan (bugün hazır)

Cursor’da `fincevirmen` MCP açıkken model zaten ajan gibi davranır:
gerekirse `retrieve`, sonra `ask`. Ürün tarafında ek döngü gerekmez.
Kontrol, araç açıklamalarında ve “madde uydurma” yasağındadır.

### Adım D — Mikroservis ancak gerekirse

Ajan eklense bile ayrı “agent servisi” şart değildir. Aynı Flask veya aynı
`mcp_server.py` içinde bir fonksiyon yeter. Ayrı servis, ancak ajan kuyruğu
ve web trafiği birbirini ezerse düşünülür.

---

## 6. Özet karar

| Soru | Karar |
|---|---|
| Mikroservise geçelim mi? | Hayır. Tek ürün, tek DB. |
| Agentic RAG varsayılan olsun mu? | Hayır. Uydurma riski. |
| Ajan nasıl durur? | MCP + kilitli araçlar. Döngü istemcide. |
| Ürün içi agentic ne zaman? | Aynı indeks, en fazla 2 retrieve, madde tahmini yok. |
| Boost yetmiyor mu? | Önce `retrieval.py` sorgusunu sıkılaştır; ajanı sona bırak. |

İlgili belgeler: [URUN.md](URUN.md), [RAG.md](RAG.md), [MCP.md](MCP.md).

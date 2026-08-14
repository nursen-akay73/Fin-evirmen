# FinÇevirmen

Finansal terimleri ve kredi/kredi kartı sözleşmelerini sade Türkçeye çeviren
RAG (Retrieval-Augmented Generation) uygulaması. Model eğitilmez; soru önce
Neon `knowledge_chunks` içinde aranır, Groq yalnızca bulunan bağlama bakarak
cevap yazar.

## RegTech

FinÇevirmen, açık kaynak gösterme ve güncellik uyarısı prensipleriyle
RegTech (regülasyon teknolojisi) alanındaki şeffaflık standartlarını
uygulamayı hedefler.

Bilgi parçalarına `regulation_source`, `last_updated_date` ve
`regulation_reference` eklenir. Cevaplarda kaynak satırı bu alanları gösterir;
365 günden eski kayıtlarda sabit bir güncellik uyarısı eklenir. Sözleşme
özetinde maddeler **Standart** veya **Dikkat** etiketiyle işaretlenir.

## Çalıştırma

```bash
./venv/bin/python scripts/init_db.py
./venv/bin/python scripts/ingest_data.py
./venv/bin/python app.py
```

Tarayıcı: http://127.0.0.1:5000

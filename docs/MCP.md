# FinÇevirmen MCP

Bu dosya **yalnızca bu repo** içindir. FinÇevirmen, tüketici finansmanı dilini
kaynaklı RAG ile açıklar. MCP, aynı motoru Cursor ajanına araç olarak sunar;
RAG’in yerini almaz.

Üçüncü parti piyasa, blog veya başka ürün sunucuları bu projeye bağlanmaz.
Onlar kendi repolarında kalır.

## Ne bağlanır, ne bağlanmaz

| Katman | Rol | Bu repoda |
|---|---|---|
| RAG | Bilgi motoru: göm → ara → rerank → kaynaklı cevap | `rag/` |
| MCP | Protokol: aynı motoru araç olarak dışarı açar | `mcp_server.py` |
| Web | Kullanıcı arayüzü | `app.py`, `pages/` |

Bağlantı dosyası global `~/.cursor/mcp.json` değildir.
Proje dosyası: [`.cursor/mcp.json`](../.cursor/mcp.json)

## Cursor’da açmak

1. Bu klasörü Cursor’da proje olarak aç.
2. **Settings → MCP** içinde `fincevirmen` sunucusunu etkinleştir.
3. İlk açılışta onay istenirse kabul et.
4. Sohbette örneğin şunu sor: `kredi kartı aidatı yasal mı, FinÇevirmen RAG ile bak`.

Ajan `ask` veya `retrieve` çağırmalıdır. Cevap web’deki `/api/ask` ile aynı
pipeline’dan gelir (`rag/pipeline.py`).

## Araçlar

| Araç | Ne yapar | LLM |
|---|---|---|
| `retrieve` | Sözlük + mevzuat parçalarını sıralar | Hayır |
| `ask` | Retrieve-then-rerank ile kaynaklı cevap yazar | Evet |
| `draft_consumer_petition` | Aidat / masraf / cayma dilekçe taslağı | Hayır (şablon) |
| `knowledge_stats` | İndeksteki parça sayısı | Hayır |

Dilekçe taslaktır; hukuki tavsiye değildir. Madde numarası araç çıktısında yoksa
uydurulmamalıdır.

## Elle denemek

Web uygulamasının çalışması şart değildir. Neon ve Groq anahtarları `.env` içinde
olmalıdır.

```bash
cd /path/to/FinCevirmen
./venv/bin/python mcp_server.py
```

Süreç stdio bekler; Cursor bunu kendisi başlatır. Elle çalıştırıp kesmek için
`Ctrl+C` yeter.

## Yapılandırma

```json
{
  "mcpServers": {
    "fincevirmen": {
      "command": "./venv/bin/python",
      "args": ["mcp_server.py"]
    }
  }
}
```

- `command` bu projenin `venv` Python’ıdır.
- Çalışma dizini proje köküdür; `.env` buradan okunur.
- Bu JSON’a başka sunucu ekleme.

## Sınırlar

- Cevap yalnızca indekslenmiş sözlük, rehber ve resmi mevzuat parçalarına dayanır.
- Model, bağlamda olmayan faiz tavanı veya madde numarası uydurmamalıdır.
- Oturumluk sözleşme PDF’leri web oturumuna aittir; MCP varsayılan olarak onları
  görmez.
- Mimari notları: [RAG.md](RAG.md)

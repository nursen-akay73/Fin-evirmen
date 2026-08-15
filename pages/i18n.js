(function (root) {
  var KEY = "fc-lang";
  var STRINGS = {
    tr: {
      "doc.title.home": "FinÇevirmen — Finansal dili sade Türkçeye çevir",
      "doc.title.how": "Sistem nasıl çalışıyor — FinÇevirmen",
      "doc.title.kb": "Bilgi tabanına ekle — FinÇevirmen",
      "doc.title.glossary": "Sözlük — FinÇevirmen",
      "doc.title.compare": "İki sözleşmeyi karşılaştır — FinÇevirmen",
      "nav.how": "Nasıl çalışır",
      "nav.compare": "Karşılaştır",
      "nav.kb": "Bilgi tabanı",
      "nav.glossary": "Sözlük",
      "hero.eyebrow": "RAG destekli sade dil asistanı",
      "hero.line1": "Finansal dili",
      "hero.line2": "sade Türkçeye çevirin",
      "hero.lede":
        "Bilanço terimlerini, kredi kartı jargonunu ve sözleşme maddelerini günlük Türkçeye çevirir. Uydurmaz; sözlük ve yüklediğiniz metne bakar.",
      "hero.explain": "Terimi açıkla",
      "hero.how": "Nasıl çalışır",
      "ask.title": "Terim çevirmeni",
      "ask.hint":
        "Yazın veya mikrofona basıp sesli sorun. Soru önce sözlükte aranır, sonra modele gider.",
      "ask.placeholder": "Örn. Repo nedir? veya Ekstremde asgari ödeme yazıyor, ne demek?",
      "ask.submit": "Açıkla",
      "ask.thinking": "Düşünüyor...",
      "ask.searching": "Sözlükte ilgili maddeler aranıyor...",
      "ask.ready": "Terim açıklaması hazır.",
      "ask.empty": "Lütfen bir soru veya metin yazın.",
      "ask.error": "Bir hata oluştu, tekrar deneyin.",
      "ask.status": "Henüz bir soru sormadınız.",
      "ask.unexpected": "Beklenmeyen bir hata oluştu.",
      "mic.label": "Sesli sorun",
      "contract.title": "Sözleşme çözümleyici",
      "contract.hint":
        "Kredi veya kredi kartı sözleşmesi PDF'i yükleyin. Faiz, ceza ve iptal maddeleri özetlenir.",
      "contract.file": "PDF seçin",
      "contract.submit": "Özetle",
      "contract.busy": "Özetleniyor...",
      "contract.extracting": "Sözleşme metni çıkarılıyor ve özetleniyor...",
      "contract.nofile": "Lütfen bir PDF dosyası seçin.",
      "contract.ready": "Sözleşme özeti hazır.",
      "contract.named": "{name} özetlendi.",
      "contract.privacy":
        "Yüklediğiniz belgeler kalıcı olarak saklanmaz, oturum sonunda silinir.",
      "contract.compare": "Karşılaştır",
      "contract.compareBusy": "Karşılaştırılıyor...",
      "contract.compareReady": "Karşılaştırma hazır.",
      "contract.compareNeed": "Karşılaştırmak için en az iki PDF seçin.",
      "contract.tooMany": "En fazla 3 PDF seçin.",
      "contract.chatHint": "Yazın veya mikrofona basıp sesli sorun.",
      "contract.chatPlaceholder": "Örn. Asgari ödeme oranı kaç?",
      "contract.chatSubmit": "Sor",
      "contract.chatBusy": "Bakılıyor...",
      "contract.chatReady": "Belgeye göre cevaplandı.",
      "contract.winner": "Hangisi avantajlı",
      "link.kb": "Bilgi tabanına ekle",
      "link.how": "Sistem nasıl çalışıyor",
      "link.glossary": "Sözlüğü gez",
      "link.compare": "İki sözleşmeyi karşılaştır",
      "compare.eyebrow": "Yan yana · uydurmaz",
      "compare.title": "İki sözleşmeyi karşılaştır",
      "compare.lede":
        "İki kredi veya kredi kartı PDF’ini yükleyin. Faiz, ceza, asgari ödeme ve iptal şartları belgedeki metne göre yan yana çıkar.",
      "compare.slotA": "Sözleşme A",
      "compare.slotB": "Sözleşme B",
      "compare.drop": "PDF sürükleyin veya seçin",
      "compare.working": "Belgeler okunuyor ve karşılaştırılıyor...",
      "results": "Sonuç",
      "speak": "Seslendir",
      "speak.stop": "Durdur",
      "card.explain": "Açıklama",
      "card.item": "Madde {n}",
      "tag.standard": "Standart",
      "tag.attention": "Dikkat",
      "src.prefix": "Kaynak",
      "src.page": "Sayfa {n}",
      "src.contract": "Sözleşme",
      "src.update": "Güncelleme: {year}",
      "src.glossary": "Terim Sözlüğü",
      "src.clause": "Sözleşme maddesi",
      "src.guide": "Tüketici rehberi",
      "src.ref": "Sözleşme referansı",
      "src.userTerm": "Eklenen terim",
      "src.userDoc": "Yüklenen belge",
      "src.userImg": "Yüklenen görüntü",
      "story.eyebrow": "Üç adım · uydurmaz",
      "story.h1": "Sistem nasıl çalışıyor",
      "story.lede":
        "Soru önce bilgi tabanında aranır. Cevap yalnızca bulunan metne dayanır.",
      "story.s1": "Soru alınır",
      "story.s1p":
        "Yazın veya sesleyin. Metin, benzerliği ölçmek için sayıya çevrilir.",
      "story.s2": "Kaynaklar aranır",
      "story.s2p":
        "Sözlük ve sizin eklediğiniz belgelerdeki en yakın parçalar bulunur.",
      "story.s3": "Sade dilde anlatılır",
      "story.s3p":
        "Model yalnızca o parçalara bakar. Yoksa “bağlamda yok” der; kaynağı gösterir.",
      "story.close": "Uydurmaz. Kaynak gösterir.",
      "story.try": "Terim çevirmenini dene",
      "story.flow.eyebrow": "Akış",
      "story.flow.title": "Soru cevaba nasıl gider",
      "story.flow.lede":
        "Genel bir sohbet modeli değil: önce arar, sonra yalnızca bulduğunu anlatır.",
      "story.flow.k1": "Girdi",
      "story.flow.n1": "Yazı veya ses",
      "story.flow.p1": "Soru yazılır ya da mikrofonla söylenir.",
      "story.flow.k2": "Çeviri",
      "story.flow.n2": "Sayıya dönüş",
      "story.flow.p2": "Metin, benzerliği ölçen bir vektöre çevrilir.",
      "story.flow.k3": "Arama",
      "story.flow.n3": "Sözlük ve belgeler",
      "story.flow.p3": "En yakın parçalar bulunur, en uygun üçü seçilir.",
      "story.flow.k4": "Karar",
      "story.flow.n4": "Parça bulundu mu?",
      "story.flow.p4": "Yoksa model dışarıdan bilgi eklemez.",
      "story.flow.yes": "Evet",
      "story.flow.n5": "Sade cevap + kaynak",
      "story.flow.p5": "Model yalnız o parçalara bakarak anlatır.",
      "story.flow.no": "Hayır",
      "story.flow.n6": "Bağlamda yok",
      "story.flow.p6": "Uydurmaz; bilmediğini açıkça söyler.",
      "story.why.eyebrow": "Neden FinÇevirmen",
      "story.why.title": "Neden bu siteye ihtiyaç var?",
      "story.why.lede":
        "Finans jargonunu genel bir sohbet botuna yapıştırmak risklidir. Cevap kulağa doğru gelir ama kaynak yoktur.",
      "story.why.1t": "Uydurmaz",
      "story.why.1p":
        "Cevap modelin hafızasından değil, sözlük ve yüklediğiniz metinden gelir. Yoksa “bağlamda yok” der.",
      "story.why.2t": "Kaynak gösterir",
      "story.why.2p":
        "Her açıklamanın yanında madde, sözlük veya sözleşme sayfası görünür. Neye dayandığını görürsünüz.",
      "story.why.3t": "Sizin belgenize bakar",
      "story.why.3p":
        "Kredi kartı sözleşmesini yükleyin; faiz ve ceza sizin PDF’inizden özetlenir. Kalıcı olarak saklanmaz.",
      "story.why.4t": "Günlük dile çevirir",
      "story.why.4p":
        "Repo, temerrüt, asgari ödeme gibi terimler banka cümlesi değil, anlaşılır Türkçe olur.",
      "story.pipe.q": "Soru",
      "story.pipe.v": "Vektör",
      "story.pipe.n": "Neon Arama",
      "story.pipe.g": "Groq Cevap",
      "story.pipe.question": "Repo nedir?",
      "story.pipe.search": "En yakın parçalar",
      "story.pipe.answer": "Repo, bir kıymetin geri alınmak üzere satılmasıdır.",
      "story.pipe.source": "Kaynak: terim_sozlugu — Repo",
      "preview.url": "fincevirmen.app",
      "preview.q": "Repo nedir?",
      "preview.hit1": "terim sözlüğü · Repo",
      "preview.hit2": "tüketici rehberi · Kısa vadeli borç",
      "preview.hit3": "sözleşme maddesi · Teminat",
      "preview.score": "yakın",
      "preview.aTitle": "Repo",
      "preview.aBody":
        "Kısa vadeli borçlanma: menkul kıymeti satıp sonra geri alma sözü.",
      "preview.src": "Kaynak: Terim Sözlüğü",
      "kb.title": "Bilgi tabanına ekle",
      "kb.hint":
        "Eklediğiniz terim, belge ve görüntüler Neon’a yazılır. Sonraki sorularda RAG bunları da arar.",
      "kb.loading": "Bilgi tabanı yükleniyor…",
      "kb.term": "Terim ekle",
      "kb.termName": "Terim",
      "kb.cat": "Kategori",
      "kb.explain": "Açıklama",
      "kb.example": "Örnek (isteğe bağlı)",
      "kb.saveTerm": "Terimi kaydet",
      "kb.doc": "Belge ekle",
      "kb.docHint": "PDF, TXT veya MD. Metin parçalanıp vektör olarak saklanır.",
      "kb.docPick": "PDF veya metin seçin",
      "kb.docBtn": "Belgeyi ekle",
      "kb.img": "Görüntü ekle",
      "kb.imgHint": "Dekont, ekstre veya sözleşme fotoğrafı. Metin okunup eklenir.",
      "kb.imgPick": "Görüntü seçin",
      "kb.imgBtn": "Görüntüyü ekle",
      "kb.status": "Henüz bir kayıt eklemediniz.",
      "kb.stats": "Şu an {n} parça kayıtlı. {parts}",
      "kb.empty": "Henüz kayıt yok. Bir terim ekleyebilir veya birazdan tekrar deneyebilirsiniz.",
      "kb.statsFail": "Henüz veri yüklenmedi, birazdan tekrar deneyin.",
      "kb.termRequired": "Terim adı ve açıklama zorunlu.",
      "kb.saving": "Kaydediliyor...",
      "kb.termAdded": "Terim eklendi.",
      "kb.docRequired": "Lütfen bir belge seçin.",
      "kb.adding": "Ekleniyor...",
      "kb.docAdded": "Belge eklendi.",
      "kb.imgRequired": "Lütfen bir görüntü seçin.",
      "kb.reading": "Okunuyor...",
      "kb.imgAdded": "Görüntü eklendi.",
      "kb.extracted": "Okunan metin:",
      "ph.term": "Örn. Temerrüt",
      "ph.cat": "Kredi, muhasebe…",
      "ph.explain": "Sade Türkçe anlamı",
      "ph.example": "Kısa bir cümle",
      "mic.notUnderstood": "Konuşma anlaşılamadı. Tekrar deneyin.",
      "mic.filled": "Metne çevrildi. İsterseniz düzeltip Açıkla’ya basın.",
      "mic.unsupported": "Bu tarayıcı mikrofonu desteklemiyor. Chrome deneyin.",
      "mic.permission": "Tarayıcı mikrofon izni istiyor… adres çubuğundan İzin ver’e basın.",
      "mic.listening": "Dinleniyor… bitirmek için mikrofona tekrar basın.",
      "mic.denied": "Mikrofon izni verilmedi. Adres çubuğundaki kilit simgesinden mikrofona izin verin.",
      "mic.failed": "Mikrofona erişilemedi. İzin verip tekrar deneyin.",
      "mic.empty": "Ses kaydı boş. Tekrar deneyin.",
      "mic.transcribing": "Ses metne çevriliyor…",
      "glossary.eyebrow": "Bilgi tabanı",
      "glossary.title": "Sözlük",
      "glossary.hint":
        "RAG’in baktığı terimler, maddeler ve rehber metinleri. Kaynağı gör, sonra ana sayfada açıkla.",
      "glossary.search": "Terim veya madde ara",
      "glossary.all": "Tümü",
      "glossary.terms": "Terimler",
      "glossary.clauses": "Maddeler",
      "glossary.guide": "Rehber",
      "glossary.ask": "Açıkla",
      "glossary.empty": "Bu aramaya uygun kayıt bulunamadı.",
      "glossary.loading": "Sözlük yükleniyor…",
      "glossary.count": "{n} kayıt",
      "glossary.error": "Sözlük henüz yüklenmedi, birazdan tekrar deneyin.",
      "trust.encrypt": "256-Bit Şifreleme ile Belgeleriniz Saklanmaz",
      "trust.vector": "Milisaniyelik Vektör Arama Altyapısı",
      "trust.regs": "Güncel BDDK & Tüketici Kanunu Uyumlu Veri Seti",
      "footer.note": "Uydurmaz. Kaynak gösterir. Belgeler oturum sonunda silinir.",
      "bento.k1": "01 · Vektör arama",
      "bento.t1": "Embedding ve yakınlık araması",
      "bento.p1":
        "Soru 384 boyutlu bir vektöre çevrilir. Neon + pgvector en yakın parçaları bulur, reranker en uygun üçünü seçer.",
      "bento.k2": "02 · Uydurmaz",
      "bento.t2": "Hallucination-free RAG",
      "bento.p2":
        "Model yalnız bulunan metne bakar. Parça yoksa “bağlamda yok” der; dışarıdan bilgi eklemez.",
      "bento.k3": "03 · Mevzuat",
      "bento.t3": "Sözlük ve güncel madde eşleşmesi",
      "bento.p3":
        "Terimler, BDDK ve tüketici metinleriyle eşleşir. Cevabın yanında madde ve kaynak görünür.",
      "bento.pill.grounded": "Kaynağa bağlı",
      "bento.pill.missing": "Yoksa söyler",
      "bento.pill.bddk": "BDDK",
      "bento.pill.tkhk": "Tüketici Kanunu",
      "kb.termKicker": "Sözlük kaydı",
      "kb.docKicker": "Vektörleştir",
      "kb.imgKicker": "OCR",
      "file.picked": "Seçildi",
      "file.busy": "İşleniyor",
      "file.ready": "✓ Vektörleştirildi",
      "src.noSnippet": "Alıntı bu kayıtta yok.",
      "risk.low": "Düşük risk",
      "risk.watch": "Dikkat / Eksik madde",
      "risk.high": "Yüksek risk",
      "risk.missing": "Metinde yok",
      "topic.interest": "Faiz",
      "topic.cancel": "Cayma hakkı",
      "topic.fee": "Gizli ücret",
      "topic.min": "Asgari ödeme",
      "topic.penalty": "Ceza",
      "why.badge": "Finansal güven ve netlik",
      "why.title":
        "Google aratır, genel yapay zeka uydurabilir; FinÇevirmen resmi kaynakla kanıtlar.",
      "why.lede":
        "Finans ve bankacılıkta hata payı sıfırdır. Neden standart arama motorları yerine FinÇevirmen’i tercih etmelisiniz?",
      "why.them": "Google / ChatGPT",
      "why.us": "FinÇevirmen",
      "why.1t": "Doğrulanmış ve uydurmasız bilgi (Hallucination-Free RAG)",
      "why.1them":
        "Güncelliğini yitirmiş blog siteleri veya Türkiye mevzuatında olmayan genel/uydurma terimler sunabilir.",
      "why.1us":
        "Sadece doğrulanmış sözlük, BDDK tebliğleri ve yüklenen resmi sözleşmeyi baz alır. Cevabın altına tam madde referansı ekler.",
      "why.2t": "Finansal gizli risk ve tuzak radarı",
      "why.2them": "Sözleşmeyi sadece yüzeysel özetler, aleyhte maddeleri kaçırabilir.",
      "why.2us":
        "Yıllık kart aidatı, gecikme faizi, cayma süreleri gibi kritik maddeleri tespit edip risk etiketleriyle öne çıkarır.",
      "why.3t": "Paralel sözleşme kıyaslama matrisi",
      "why.3us":
        "İki sözleşmeyi yan yana tarar; faiz, masraf ve avantajları tek bir net tabloda karşılaştırır.",
      "why.3them":
        "Farklı bankaların onlarca sayfalık PDF’lerini aynı anda kıyaslamakta ve standart tablo çıkarmakta yetersiz kalır.",
      "why.4t": "Tam gizlilik ve oturum güvenliği",
      "why.4them": "Yüklenen veriler model eğitimi için kullanılabilir risk taşır.",
      "why.4us":
        "256-bit şifreleme ile çalışır; belgeler saklanmaz, oturum kapandığında bellekten silinir.",
    },
    en: {
      "doc.title.home": "FinÇevirmen — Plain-language finance translator",
      "doc.title.how": "How the system works — FinÇevirmen",
      "doc.title.kb": "Add to knowledge base — FinÇevirmen",
      "doc.title.glossary": "Glossary — FinÇevirmen",
      "doc.title.compare": "Compare two contracts — FinÇevirmen",
      "nav.how": "How it works",
      "nav.compare": "Compare",
      "nav.kb": "Knowledge base",
      "nav.glossary": "Glossary",
      "hero.eyebrow": "RAG-powered plain-language assistant",
      "hero.line1": "Translate finance",
      "hero.line2": "into everyday language",
      "hero.lede":
        "It explains balance-sheet terms, card jargon and contract clauses in plain English. It does not invent facts; it looks at the glossary and the text you add.",
      "hero.explain": "Explain a term",
      "hero.how": "How it works",
      "ask.title": "Term translator",
      "ask.hint":
        "Type or tap the mic. The question is searched in the knowledge base first, then sent to the model.",
      "ask.placeholder": "e.g. What is a repo? or What does minimum payment mean?",
      "ask.submit": "Explain",
      "ask.thinking": "Thinking...",
      "ask.searching": "Searching the glossary...",
      "ask.ready": "Explanation ready.",
      "ask.empty": "Please enter a question or a short text.",
      "ask.error": "Something went wrong. Please try again.",
      "ask.status": "You have not asked a question yet.",
      "ask.unexpected": "An unexpected error occurred.",
      "mic.label": "Ask by voice",
      "contract.title": "Contract analyser",
      "contract.hint":
        "Upload a loan or credit-card contract PDF. Interest, penalty and cancellation clauses are summarised.",
      "contract.file": "Choose PDF",
      "contract.submit": "Summarise",
      "contract.busy": "Summarising...",
      "contract.extracting": "Extracting the contract and summarising...",
      "contract.nofile": "Please choose a PDF file.",
      "contract.ready": "Contract summary ready.",
      "contract.named": "{name} summarised.",
      "contract.privacy":
        "Uploaded documents are not stored permanently; they are deleted at the end of the session.",
      "contract.compare": "Compare",
      "contract.compareBusy": "Comparing...",
      "contract.compareReady": "Comparison ready.",
      "contract.compareNeed": "Choose at least two PDFs to compare.",
      "contract.tooMany": "Please choose at most 3 PDF files.",
      "contract.chatHint": "Type or tap the mic to ask out loud.",
      "contract.chatPlaceholder": "e.g. What is the minimum payment rate?",
      "contract.chatSubmit": "Ask",
      "contract.chatBusy": "Looking...",
      "contract.chatReady": "Answered from the document.",
      "contract.winner": "Which is better",
      "link.kb": "Add to knowledge base",
      "link.how": "How the system works",
      "link.glossary": "Browse the glossary",
      "link.compare": "Compare two contracts",
      "compare.eyebrow": "Side by side · no invention",
      "compare.title": "Compare two contracts",
      "compare.lede":
        "Upload two loan or credit-card PDFs. Interest, penalties, minimum payment and cancellation terms are laid out from the text only.",
      "compare.slotA": "Contract A",
      "compare.slotB": "Contract B",
      "compare.drop": "Drop a PDF or choose a file",
      "compare.working": "Reading and comparing the documents...",
      "results": "Result",
      "speak": "Speak",
      "speak.stop": "Stop",
      "card.explain": "Explanation",
      "card.item": "Item {n}",
      "tag.standard": "Standard",
      "tag.attention": "Attention",
      "src.prefix": "Source",
      "src.page": "Page {n}",
      "src.contract": "Contract",
      "src.update": "Updated: {year}",
      "src.glossary": "Glossary",
      "src.clause": "Contract clause",
      "src.guide": "Consumer guide",
      "src.ref": "Contract reference",
      "src.userTerm": "Added term",
      "src.userDoc": "Uploaded document",
      "src.userImg": "Uploaded image",
      "story.eyebrow": "Three steps · no invention",
      "story.h1": "How the system works",
      "story.lede":
        "The question is searched in the knowledge base first. The answer uses only what is found.",
      "story.s1": "The question is taken",
      "story.s1p":
        "Type or speak. The text is turned into numbers so similar passages can be found.",
      "story.s2": "Sources are searched",
      "story.s2p":
        "The closest passages in the glossary and in documents you added are retrieved.",
      "story.s3": "It is explained in plain language",
      "story.s3p":
        "The model looks only at those passages. If it is not there, it says so and shows the source.",
      "story.close": "It does not invent. It shows the source.",
      "story.try": "Try the term translator",
      "story.flow.eyebrow": "Flow",
      "story.flow.title": "How a question becomes an answer",
      "story.flow.lede":
        "This is not a general chatbot: it searches first, then explains only what it found.",
      "story.flow.k1": "Input",
      "story.flow.n1": "Text or voice",
      "story.flow.p1": "The question is typed or spoken into the mic.",
      "story.flow.k2": "Convert",
      "story.flow.n2": "Turned into numbers",
      "story.flow.p2": "The text becomes a vector so similar passages can be found.",
      "story.flow.k3": "Search",
      "story.flow.n3": "Glossary and documents",
      "story.flow.p3": "The closest passages are found; the best three are kept.",
      "story.flow.k4": "Decision",
      "story.flow.n4": "Was a passage found?",
      "story.flow.p4": "If not, the model does not add outside knowledge.",
      "story.flow.yes": "Yes",
      "story.flow.n5": "Plain answer + source",
      "story.flow.p5": "The model explains using only those passages.",
      "story.flow.no": "No",
      "story.flow.n6": "Not in the context",
      "story.flow.p6": "It does not invent; it says it does not know.",
      "story.why.eyebrow": "Why FinÇevirmen",
      "story.why.title": "Why do you need this site?",
      "story.why.lede":
        "Pasting finance jargon into a general chatbot is risky. The answer may sound right, but there is no source.",
      "story.why.1t": "It does not invent",
      "story.why.1p":
        "The answer comes from the glossary and the text you upload, not from the model’s memory. If it is missing, it says so.",
      "story.why.2t": "It shows the source",
      "story.why.2p":
        "Each explanation cites a clause, glossary entry or contract page. You can see what it relied on.",
      "story.why.3t": "It reads your document",
      "story.why.3p":
        "Upload a card contract; interest and fees are summarised from your PDF. Nothing is stored permanently.",
      "story.why.4t": "It uses everyday language",
      "story.why.4p":
        "Terms such as repo, default and minimum payment become plain language, not bank-speak.",
      "story.pipe.q": "Question",
      "story.pipe.v": "Vector",
      "story.pipe.n": "Neon search",
      "story.pipe.g": "Groq answer",
      "story.pipe.question": "What is a repo?",
      "story.pipe.search": "Nearest passages",
      "story.pipe.answer": "A repo is the sale of a security with an agreement to buy it back.",
      "story.pipe.source": "Source: terim_sozlugu — Repo",
      "preview.url": "fincevirmen.app",
      "preview.q": "What is a repo?",
      "preview.hit1": "glossary · Repo",
      "preview.hit2": "consumer guide · Short-term borrowing",
      "preview.hit3": "contract clause · Collateral",
      "preview.score": "close",
      "preview.aTitle": "Repo",
      "preview.aBody":
        "Short-term borrowing: sell a security and promise to buy it back.",
      "preview.src": "Source: Glossary",
      "kb.title": "Add to the knowledge base",
      "kb.hint":
        "Terms, documents and images you add are stored in Neon. Later questions search them too.",
      "kb.loading": "Loading knowledge base…",
      "kb.term": "Add a term",
      "kb.termName": "Term",
      "kb.cat": "Category",
      "kb.explain": "Explanation",
      "kb.example": "Example (optional)",
      "kb.saveTerm": "Save term",
      "kb.doc": "Add a document",
      "kb.docHint": "PDF, TXT or MD. Text is chunked and stored as vectors.",
      "kb.docPick": "Choose PDF or text",
      "kb.docBtn": "Add document",
      "kb.img": "Add an image",
      "kb.imgHint": "Receipt, statement or contract photo. Text is read and stored.",
      "kb.imgPick": "Choose image",
      "kb.imgBtn": "Add image",
      "kb.status": "You have not added a record yet.",
      "kb.stats": "{n} chunks stored. {parts}",
      "kb.empty": "No records yet. Add a term here, or try again shortly.",
      "kb.statsFail": "Nothing to show yet. Please try again in a moment.",
      "kb.termRequired": "Term name and explanation are required.",
      "kb.saving": "Saving...",
      "kb.termAdded": "Term added.",
      "kb.docRequired": "Please choose a document.",
      "kb.adding": "Adding...",
      "kb.docAdded": "Document added.",
      "kb.imgRequired": "Please choose an image.",
      "kb.reading": "Reading...",
      "kb.imgAdded": "Image added.",
      "kb.extracted": "Extracted text:",
      "ph.term": "e.g. Default",
      "ph.cat": "Credit, accounting…",
      "ph.explain": "Plain-language meaning",
      "ph.example": "A short sentence",
      "mic.notUnderstood": "Speech was not understood. Please try again.",
      "mic.filled": "Converted to text. Edit if you like, then tap Explain.",
      "mic.unsupported": "This browser does not support the microphone. Try Chrome.",
      "mic.permission": "The browser is asking for the microphone… tap Allow in the address bar.",
      "mic.listening": "Listening… tap the mic again to finish.",
      "mic.denied": "Microphone permission was denied. Allow it from the lock icon in the address bar.",
      "mic.failed": "Could not reach the microphone. Allow access and try again.",
      "mic.empty": "The recording was empty. Please try again.",
      "mic.transcribing": "Turning speech into text…",
      "glossary.eyebrow": "Knowledge base",
      "glossary.title": "Glossary",
      "glossary.hint":
        "The terms, clauses and guide passages RAG looks at. See the source, then explain it on the home page.",
      "glossary.search": "Search a term or clause",
      "glossary.all": "All",
      "glossary.terms": "Terms",
      "glossary.clauses": "Clauses",
      "glossary.guide": "Guide",
      "glossary.ask": "Explain",
      "glossary.empty": "No matching records yet.",
      "glossary.loading": "Loading glossary…",
      "glossary.count": "{n} records",
      "glossary.error": "The glossary hasn’t loaded yet. Please try again in a moment.",
      "trust.encrypt": "256-bit encryption · documents are not stored",
      "trust.vector": "Millisecond vector search",
      "trust.regs": "BDDK & consumer-law aligned dataset",
      "footer.note": "It does not invent. It cites sources. Files are deleted at the end of the session.",
      "bento.k1": "01 · Vector search",
      "bento.t1": "Embeddings and nearest-neighbour lookup",
      "bento.p1":
        "The question becomes a 384-d vector. Neon + pgvector finds the closest passages; the reranker keeps the best three.",
      "bento.k2": "02 · No invention",
      "bento.t2": "Hallucination-free RAG",
      "bento.p2":
        "The model looks only at retrieved text. If nothing is found it says so; it does not add outside facts.",
      "bento.k3": "03 · Regulation",
      "bento.t3": "Glossary and current clause matching",
      "bento.p3":
        "Terms are matched to BDDK and consumer-law passages. The answer shows the clause and the source.",
      "bento.pill.grounded": "Grounded",
      "bento.pill.missing": "Says when missing",
      "bento.pill.bddk": "BDDK",
      "bento.pill.tkhk": "Consumer law",
      "kb.termKicker": "Glossary record",
      "kb.docKicker": "Vectorise",
      "kb.imgKicker": "OCR",
      "file.picked": "Selected",
      "file.busy": "Processing",
      "file.ready": "✓ Vectorised",
      "src.noSnippet": "No excerpt on this record.",
      "risk.low": "Low risk",
      "risk.watch": "Attention / missing clause",
      "risk.high": "High risk",
      "risk.missing": "Not in the text",
      "topic.interest": "Interest",
      "topic.cancel": "Withdrawal",
      "topic.fee": "Hidden fees",
      "topic.min": "Minimum payment",
      "topic.penalty": "Penalty",
      "why.badge": "Financial trust and clarity",
      "why.title":
        "Google searches, a general model may invent; FinÇevirmen cites the official source.",
      "why.lede":
        "In banking, the margin for error is zero. Why choose FinÇevirmen over a search engine or a general chatbot?",
      "why.them": "Google / ChatGPT",
      "why.us": "FinÇevirmen",
      "why.1t": "Verified, hallucination-free answers",
      "why.1them":
        "It may surface stale blogs or generic terms that do not exist in Turkish regulation.",
      "why.1us":
        "It uses only the verified glossary, BDDK notices and the official contract you upload. Every answer carries a clause reference.",
      "why.2t": "Hidden-risk and trap radar",
      "why.2them": "It may summarise a contract at the surface and miss clauses that work against you.",
      "why.2us":
        "It flags annual card fees, default interest and withdrawal windows with proactive risk labels.",
      "why.3t": "Side-by-side contract matrix",
      "why.3them":
        "It struggles to compare dozens of pages from two banks and produce a standard table.",
      "why.3us":
        "It reads two contracts in parallel and lays interest, fees and advantages in one clear table.",
      "why.4t": "Session privacy, end to end",
      "why.4them": "Uploaded files may be used to train the model.",
      "why.4us":
        "It uses 256-bit encryption. Documents are not stored; they are wiped from memory when the session ends.",
    },
  };

  function current() {
    var stored = "";
    try {
      stored = localStorage.getItem(KEY) || "";
    } catch (error) {
      stored = "";
    }
    return stored === "en" ? "en" : "tr";
  }

  function interpolate(text, vars) {
    if (!vars) {
      return text;
    }
    return String(text).replace(/\{(\w+)\}/g, function (_, name) {
      return vars[name] == null ? "" : String(vars[name]);
    });
  }

  function t(key, vars) {
    var lang = current();
    var text = (STRINGS[lang] && STRINGS[lang][key]) || (STRINGS.tr && STRINGS.tr[key]) || key;
    return interpolate(text, vars);
  }

  function apply(lang) {
    lang = lang === "en" ? "en" : "tr";
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      var key = node.getAttribute("data-i18n");
      if (key && STRINGS[lang][key]) {
        node.textContent = STRINGS[lang][key];
      }
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (node) {
      var key = node.getAttribute("data-i18n-placeholder");
      if (key && STRINGS[lang][key]) {
        node.setAttribute("placeholder", STRINGS[lang][key]);
      }
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (node) {
      var key = node.getAttribute("data-i18n-aria");
      if (key && STRINGS[lang][key]) {
        node.setAttribute("aria-label", STRINGS[lang][key]);
        node.setAttribute("title", STRINGS[lang][key]);
      }
    });
    var titleKey = document.body.getAttribute("data-title-key");
    if (titleKey && STRINGS[lang][titleKey]) {
      document.title = STRINGS[lang][titleKey];
    }
    document.querySelectorAll("[data-lang-switch]").forEach(function (button) {
      button.classList.toggle("is-en", lang === "en");
      button.setAttribute("aria-pressed", lang === "en" ? "true" : "false");
    });
  }

  function setLang(lang) {
    lang = lang === "en" ? "en" : "tr";
    try {
      localStorage.setItem(KEY, lang);
    } catch (error) {
      /* ignore */
    }
    apply(lang);
    if (document.querySelector("[data-split] .word, [data-how-title] .word")) {
      window.setTimeout(function () {
        window.location.reload();
      }, 380);
    }
  }

  function bind() {
    document.querySelectorAll("[data-lang-switch]").forEach(function (button) {
      button.addEventListener("click", function () {
        setLang(current() === "en" ? "tr" : "en");
      });
    });
  }

  root.I18N = {
    t: t,
    lang: current,
    set: setLang,
  };

  var bound = false;
  function boot() {
    apply(current());
    if (!bound) {
      bind();
      bound = true;
    }
  }

  if (document.body) {
    boot();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  }
})(window);

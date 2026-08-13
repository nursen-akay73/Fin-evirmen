const askForm = document.getElementById("ask-form");
const uploadForm = document.getElementById("upload-form");
const questionInput = document.getElementById("question");
const fileInput = document.getElementById("pdf-file");
const fileName = document.getElementById("file-name");
const askButton = document.getElementById("ask-button");
const uploadButton = document.getElementById("upload-button");
const micButton = document.getElementById("mic-button");
const micStatus = document.getElementById("mic-status");
const statusEl = document.getElementById("status");
const answerEl = document.getElementById("answer");
const sourcesEl = document.getElementById("sources");
const speakButton = document.getElementById("speak-button");
const speakLabel = speakButton
  ? speakButton.querySelector(".speak-label")
  : null;

if (fileInput && fileName) {
  fileInput.addEventListener("change", () => {
    fileName.textContent = fileInput.files[0]
      ? fileInput.files[0].name
      : "PDF seçin";
  });
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.classList.toggle("is-loading", busy);
  if (busy) {
    button.innerHTML =
      '<span class="btn-spinner" aria-hidden="true"></span><span>' +
      label +
      "</span>";
  } else {
    button.textContent = label;
  }
}

function stripMarkdown(text) {
  return String(text || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/[_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTitleBody(block, index) {
  const cleaned = String(block || "").trim();
  const titled = cleaned.match(/^\*\*(.+?)\*\*\s*[:：.\-–—]?\s*([\s\S]*)$/);
  if (titled && titled[1].trim()) {
    return { title: titled[1].trim(), body: titled[2].trim() };
  }
  const lines = cleaned.split(/\n/);
  const first = (lines[0] || "").replace(/^\*\*|\*\*$/g, "").trim();
  if (lines.length > 1 && first.length && first.length < 72) {
    return { title: first, body: lines.slice(1).join("\n").trim() };
  }
  return {
    title: index === 0 ? "Açıklama" : `Madde ${index + 1}`,
    body: cleaned,
  };
}

function parseInsightCards(answer) {
  const text = String(answer || "").trim();
  if (!text) {
    return [];
  }
  const numbered = text
    .split(/(?=^\s*\d+[.)]\s+)/m)
    .map((piece) => piece.trim())
    .filter(Boolean);
  const looksNumbered =
    numbered.length >= 2 ||
    (numbered.length === 1 && /^\d+[.)]\s+/.test(numbered[0]));
  if (looksNumbered) {
    return numbered.map((block, index) =>
      splitTitleBody(block.replace(/^\d+[.)]\s+/, ""), index)
    );
  }
  const boldBlocks = text
    .split(/(?=^\s*\*\*[^*]+\*\*)/m)
    .map((piece) => piece.trim())
    .filter(Boolean);
  if (boldBlocks.length >= 2) {
    return boldBlocks.map((block, index) => splitTitleBody(block, index));
  }
  return [splitTitleBody(text, 0)];
}

function appendRichText(target, text) {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*)/g);
  parts.forEach((part) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) {
      const strong = document.createElement("strong");
      strong.textContent = bold[1];
      target.appendChild(strong);
    } else if (part) {
      target.appendChild(document.createTextNode(part));
    }
  });
}

function renderInsightCards(answer) {
  const cards = parseInsightCards(answer);
  if (!answerEl) {
    return cards;
  }
  answerEl.innerHTML = "";
  if (!cards.length) {
    return [];
  }
  const grid = document.createElement("div");
  grid.className = "insight-grid" + (cards.length > 1 ? " is-many" : "");
  cards.forEach((card, index) => {
    const article = document.createElement("article");
    article.className = "insight-card";
    article.dataset.tone = String(index % 5);
    const indexEl = document.createElement("span");
    indexEl.className = "insight-index";
    indexEl.textContent = String(index + 1).padStart(2, "0");
    const titleEl = document.createElement("h3");
    titleEl.textContent = card.title;
    const bodyEl = document.createElement("p");
    appendRichText(bodyEl, card.body);
    article.append(indexEl, titleEl, bodyEl);
    grid.appendChild(article);
  });
  answerEl.appendChild(grid);
  return cards;
}

const speaker = {
  cards: [],
  voice: null,
  speaking: false,
};

function pickTurkishVoice() {
  if (!window.speechSynthesis) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => (voice.lang || "").toLowerCase().startsWith("tr")) ||
    voices.find((voice) => /turk|türk/i.test(voice.name || "")) ||
    null
  );
}

function setSpeakUi(speaking) {
  speaker.speaking = speaking;
  if (!speakButton || !speakLabel) {
    return;
  }
  speakButton.classList.toggle("is-speaking", speaking);
  speakButton.setAttribute("aria-pressed", speaking ? "true" : "false");
  speakLabel.textContent = speaking ? "Durdur" : "Seslendir";
}

function clearSpeakingCards() {
  answerEl
    .querySelectorAll(".insight-card.is-speaking")
    .forEach((card) => card.classList.remove("is-speaking"));
}

function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  clearSpeakingCards();
  setSpeakUi(false);
}

function speakCards(startIndex) {
  if (!window.speechSynthesis) {
    return;
  }
  const cards = speaker.cards;
  let index = startIndex || 0;
  const speakNext = () => {
    if (index >= cards.length) {
      clearSpeakingCards();
      setSpeakUi(false);
      return;
    }
    const cardEls = answerEl.querySelectorAll(".insight-card");
    clearSpeakingCards();
    if (cardEls[index]) {
      cardEls[index].classList.add("is-speaking");
    }
    const card = cards[index];
    const utterance = new SpeechSynthesisUtterance(
      [card.title, stripMarkdown(card.body)].filter(Boolean).join(". ")
    );
    utterance.lang = "tr-TR";
    utterance.rate = 0.95;
    if (speaker.voice) {
      utterance.voice = speaker.voice;
    }
    utterance.onend = () => {
      index += 1;
      speakNext();
    };
    utterance.onerror = () => {
      clearSpeakingCards();
      setSpeakUi(false);
    };
    window.speechSynthesis.speak(utterance);
  };
  setSpeakUi(true);
  speakNext();
}

function toggleSpeaking() {
  if (!window.speechSynthesis || !speaker.cards.length) {
    return;
  }
  if (speaker.speaking) {
    stopSpeaking();
    return;
  }
  speaker.voice = pickTurkishVoice() || speaker.voice;
  speakCards(0);
}

if (window.speechSynthesis) {
  speaker.voice = pickTurkishVoice();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    speaker.voice = pickTurkishVoice() || speaker.voice;
  });
}

if (speakButton) {
  speakButton.addEventListener("click", toggleSpeaking);
}

function showError(message) {
  stopSpeaking();
  if (!statusEl) {
    window.alert(message);
    return;
  }
  statusEl.textContent = message;
  statusEl.classList.add("error");
  if (answerEl) {
    answerEl.hidden = true;
    answerEl.innerHTML = "";
  }
  if (sourcesEl) {
    sourcesEl.hidden = true;
    sourcesEl.innerHTML = "";
  }
  if (speakButton) {
    speakButton.hidden = true;
  }
  speaker.cards = [];
}

function showAnswer(answer, sources, statusText) {
  stopSpeaking();
  if (!statusEl || !answerEl) {
    return;
  }
  statusEl.textContent = statusText;
  statusEl.classList.remove("error");
  speaker.cards = renderInsightCards(answer);
  answerEl.hidden = !speaker.cards.length;
  if (speakButton) {
    speakButton.hidden = !speaker.cards.length || !window.speechSynthesis;
  }
  if (!sourcesEl) {
    return;
  }
  sourcesEl.innerHTML = "";
  const line = formatSourceLine(sources);
  if (line) {
    sourcesEl.hidden = false;
    const item = document.createElement("li");
    item.textContent = line;
    sourcesEl.appendChild(item);
  } else {
    sourcesEl.hidden = true;
  }
}

const SOURCE_TYPE_LABELS = {
  terim_sozlugu: "Terim Sözlüğü",
  sozlesme_maddesi: "Sözleşme maddesi",
  tuketici_rehberi: "Tüketici rehberi",
  sozlesme_referans: "Sözleşme referansı",
  kullanici_terim: "Eklenen terim",
  kullanici_belge: "Yüklenen belge",
  kullanici_gorsel: "Yüklenen görüntü",
  sozlesme: "Sözleşme",
};

function formatSourceLine(sources) {
  if (!sources || !sources.length) {
    return "";
  }
  const pages = [];
  sources.forEach((source) => {
    if (source.page_number && !pages.includes(source.page_number)) {
      pages.push(source.page_number);
    }
  });
  if (pages.length) {
    const pageLabel = pages
      .sort((left, right) => left - right)
      .map((page) => `Sayfa ${page}`)
      .join(", ");
    return `Kaynak: Sözleşme, ${pageLabel}`;
  }
  const glossary = sources.find(
    (source) => (source.source_type || source.type) === "terim_sozlugu"
  );
  const primary = glossary || sources[0];
  const name = primary.source_name || primary.name;
  if (!name) {
    return "";
  }
  const type = primary.source_type || primary.type;
  const label = SOURCE_TYPE_LABELS[type] || "Kaynak";
  return `Kaynak: ${label} — ${name}`;
}

async function parseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Beklenmeyen bir hata oluştu.");
  }
  return data;
}

if (askForm) {
  askForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = questionInput.value.trim();
    if (!question) {
      showError("Lütfen bir soru veya metin yazın.");
      return;
    }

    setBusy(askButton, true, "Düşünüyor...");
    if (statusEl) {
      statusEl.textContent = "Sözlükte ilgili maddeler aranıyor...";
      statusEl.classList.remove("error");
    }

    try {
      const data = await parseJson(
        await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        })
      );
      showAnswer(data.answer, data.sources, "Terim açıklaması hazır.");
    } catch (error) {
      showError("Bir hata oluştu, tekrar deneyin.");
    } finally {
      setBusy(askButton, false, "Açıkla");
    }
  });
}

if (uploadForm) {
  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = fileInput.files[0];
    if (!file) {
      showError("Lütfen bir PDF dosyası seçin.");
      return;
    }

    const body = new FormData();
    body.append("file", file);
    setBusy(uploadButton, true, "Özetleniyor...");
    if (statusEl) {
      statusEl.textContent = "Sözleşme metni çıkarılıyor ve özetleniyor...";
      statusEl.classList.remove("error");
    }

    try {
      const data = await parseJson(
        await fetch("/api/upload-sozlesme", {
          method: "POST",
          body,
        })
      );
      const label = data.filename
        ? `${data.filename} özetlendi.`
        : "Sözleşme özeti hazır.";
      showAnswer(data.answer, data.sources, label);
    } catch (error) {
      showError("Bir hata oluştu, tekrar deneyin.");
    } finally {
      setBusy(uploadButton, false, "Özetle");
    }
  });
}

function SpeechToText() {
  this.listening = false;
  this.recognition = null;
  this.media = { stream: null, recorder: null, chunks: [] };
  this.usingBrowserSpeech = Boolean(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );
  micButton.addEventListener("click", () => this.toggle());
}

SpeechToText.prototype.setStatus = function (message, isError) {
  if (!message) {
    micStatus.hidden = true;
    micStatus.textContent = "";
    micStatus.classList.remove("is-error");
    return;
  }
  micStatus.hidden = false;
  micStatus.textContent = message;
  micStatus.classList.toggle("is-error", Boolean(isError));
};

SpeechToText.prototype.setListening = function (listening) {
  this.listening = listening;
  micButton.classList.toggle("is-listening", listening);
  micButton.setAttribute("aria-pressed", listening ? "true" : "false");
  micButton.disabled = false;
};

SpeechToText.prototype.fillQuestion = function (text) {
  const spoken = (text || "").trim();
  if (!spoken) {
    this.setStatus("Konuşma anlaşılamadı. Tekrar deneyin.", true);
    return;
  }
  const current = questionInput.value.trim();
  questionInput.value = current ? `${current} ${spoken}` : spoken;
  questionInput.dispatchEvent(new Event("input", { bubbles: true }));
  this.setStatus("Metne çevrildi. İsterseniz düzeltip Açıkla’ya basın.");
};

SpeechToText.prototype.toggle = function () {
  if (this.listening) {
    this.stop();
    return;
  }
  if (this.usingBrowserSpeech) {
    this.startBrowserSpeech();
    return;
  }
  this.startRecording();
};

SpeechToText.prototype.startBrowserSpeech = function () {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new Recognition();
  this.recognition = recognition;
  recognition.lang = "tr-TR";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onstart = () => {
    this.setListening(true);
    this.setStatus("Dinleniyor… bitirmek için mikrofona tekrar basın.");
  };
  recognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";
    for (let index = 0; index < event.results.length; index += 1) {
      const piece = event.results[index][0].transcript;
      if (event.results[index].isFinal) {
        finalText += piece;
      } else {
        interimText += piece;
      }
    }
    if (interimText) {
      this.setStatus(interimText);
    }
    if (finalText) {
      this.fillQuestion(finalText);
    }
  };
  recognition.onerror = (event) => {
    if (event.error === "not-allowed") {
      this.setStatus("Mikrofon izni verilmedi. Tarayıcı ayarından izin verin.", true);
    } else if (event.error !== "aborted" && event.error !== "no-speech") {
      this.usingBrowserSpeech = false;
      this.setStatus("Tarayıcı dinleyemedi, kayıt ile denenecek.");
      this.startRecording();
      return;
    } else if (event.error === "no-speech") {
      this.setStatus("Ses algılanamadı. Yakın konuşup tekrar deneyin.", true);
    }
    this.setListening(false);
  };
  recognition.onend = () => {
    this.setListening(false);
    this.recognition = null;
  };
  try {
    recognition.start();
  } catch (error) {
    this.usingBrowserSpeech = false;
    this.startRecording();
  }
};

SpeechToText.prototype.startRecording = async function () {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    this.setStatus("Bu tarayıcı mikrofonu desteklemiyor. Chrome deneyin.", true);
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    this.media = { stream, recorder, chunks: [] };
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size) {
        this.media.chunks.push(event.data);
      }
    };
    recorder.onstop = () => this.sendRecording();
    recorder.start();
    this.setListening(true);
    this.setStatus("Dinleniyor… bitirmek için mikrofona tekrar basın.");
    this.recordTimer = window.setTimeout(() => this.stop(), 20000);
  } catch (error) {
    this.setStatus("Mikrofona erişilemedi. İzin verip tekrar deneyin.", true);
    this.setListening(false);
  }
};

SpeechToText.prototype.sendRecording = async function () {
  const { stream, chunks, recorder } = this.media;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  this.media = { stream: null, recorder: null, chunks: [] };
  const blob = new Blob(chunks, { type: recorder && recorder.mimeType ? recorder.mimeType : "audio/webm" });
  if (!blob.size) {
    this.setStatus("Ses kaydı boş. Tekrar deneyin.", true);
    return;
  }
  const body = new FormData();
  const extension = blob.type.includes("mp4") ? "m4a" : "webm";
  body.append("audio", blob, `speech.${extension}`);
  micButton.disabled = true;
  this.setStatus("Ses metne çevriliyor…");
  try {
    const data = await parseJson(
      await fetch("/api/transcribe", {
        method: "POST",
        body,
      })
    );
    this.fillQuestion(data.text);
  } catch (error) {
    this.setStatus(error.message, true);
  } finally {
    micButton.disabled = false;
  }
};

SpeechToText.prototype.stop = function () {
  window.clearTimeout(this.recordTimer);
  if (this.recognition) {
    try {
      this.recognition.stop();
    } catch (error) {
      /* already stopped */
    }
    return;
  }
  if (this.media.recorder && this.media.recorder.state !== "inactive") {
    this.media.recorder.stop();
  }
  this.setListening(false);
};

if (micButton) {
  new SpeechToText();
}

const termForm = document.getElementById("term-form");
const docForm = document.getElementById("doc-form");
const imageForm = document.getElementById("image-form");
const termButton = document.getElementById("term-button");
const docButton = document.getElementById("doc-button");
const imageButton = document.getElementById("image-button");
const kbDocFile = document.getElementById("kb-doc-file");
const kbImageFile = document.getElementById("kb-image-file");
const kbDocName = document.getElementById("kb-doc-name");
const kbImageName = document.getElementById("kb-image-name");
const kbStats = document.getElementById("kb-stats");

async function refreshStats() {
  if (!kbStats) {
    return;
  }
  try {
    const data = await parseJson(await fetch("/api/knowledge/stats"));
    const parts = Object.entries(data.by_type || {}).map(
      ([name, count]) => `${name}: ${count}`
    );
    kbStats.textContent = data.total
      ? `Şu an ${data.total} parça kayıtlı. ${parts.join(" · ")}`
      : "Bilgi tabanı boş. Önce ingest çalıştırın veya buradan ekleyin.";
  } catch (error) {
    kbStats.textContent = "Bilgi tabanı istatistiği alınamadı.";
  }
}

if (kbDocFile && kbDocName) {
  kbDocFile.addEventListener("change", () => {
    kbDocName.textContent = kbDocFile.files[0] ? kbDocFile.files[0].name : "PDF veya metin seçin";
  });
}
if (kbImageFile && kbImageName) {
  kbImageFile.addEventListener("change", () => {
    kbImageName.textContent = kbImageFile.files[0] ? kbImageFile.files[0].name : "Görüntü seçin";
  });
}

if (termForm) {
  termForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const terim = document.getElementById("term-name").value.trim();
    const aciklama = document.getElementById("term-explain").value.trim();
    if (!terim || !aciklama) {
      showError("Terim adı ve açıklama zorunlu.");
      return;
    }
    setBusy(termButton, true, "Kaydediliyor...");
    try {
      const data = await parseJson(
        await fetch("/api/knowledge/term", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            terim,
            aciklama,
            kategori: document.getElementById("term-category").value.trim(),
            ornek: document.getElementById("term-example").value.trim(),
          }),
        })
      );
      showAnswer(data.message, [], "Terim eklendi.");
      termForm.reset();
      refreshStats();
    } catch (error) {
      showError(error.message);
    } finally {
      setBusy(termButton, false, "Terimi kaydet");
    }
  });
}

if (docForm) {
  docForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = kbDocFile.files[0];
    if (!file) {
      showError("Lütfen bir belge seçin.");
      return;
    }
    const body = new FormData();
    body.append("file", file);
    setBusy(docButton, true, "Ekleniyor...");
    try {
      const data = await parseJson(await fetch("/api/knowledge/document", { method: "POST", body }));
      showAnswer(data.message, [], "Belge eklendi.");
      docForm.reset();
      kbDocName.textContent = "PDF veya metin seçin";
      refreshStats();
    } catch (error) {
      showError(error.message);
    } finally {
      setBusy(docButton, false, "Belgeyi ekle");
    }
  });
}

if (imageForm) {
  imageForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = kbImageFile.files[0];
    if (!file) {
      showError("Lütfen bir görüntü seçin.");
      return;
    }
    const body = new FormData();
    body.append("file", file);
    setBusy(imageButton, true, "Okunuyor...");
    try {
      const data = await parseJson(await fetch("/api/knowledge/image", { method: "POST", body }));
      const detail = data.extracted
        ? `${data.message}\n\nOkunan metin:\n${data.extracted}`
        : data.message;
      showAnswer(detail, [], "Görüntü eklendi.");
      imageForm.reset();
      kbImageName.textContent = "Görüntü seçin";
      refreshStats();
    } catch (error) {
      showError(error.message);
    } finally {
      setBusy(imageButton, false, "Görüntüyü ekle");
    }
  });
}

refreshStats();

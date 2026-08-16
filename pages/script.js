function currentLang() {
  return window.I18N && window.I18N.lang ? window.I18N.lang() : "tr";
}

function t(key, vars) {
  return window.I18N && window.I18N.t ? window.I18N.t(key, vars) : key;
}

const askForm = document.getElementById("ask-form");
const uploadForm = document.getElementById("upload-form");
const questionInput = document.getElementById("question");
const fileInput = document.getElementById("pdf-file");
const fileName = document.getElementById("file-name");
const askButton = document.getElementById("ask-button");
const uploadButton = document.getElementById("upload-button");
const compareButton = document.getElementById("compare-button");
const contractChat = document.getElementById("contract-chat");
const contractAskForm = document.getElementById("contract-ask-form");
const contractQuestion = document.getElementById("contract-question");
const contractAskButton = document.getElementById("contract-ask-button");
const contractMicButton = document.getElementById("contract-mic-button");
const contractMicStatus = document.getElementById("contract-mic-status");
const micButton = document.getElementById("mic-button");
const micStatus = document.getElementById("mic-status");
const statusEl = document.getElementById("status");
const answerEl = document.getElementById("answer");
const sourcesEl = document.getElementById("sources");
const speakButton = document.getElementById("speak-button");
const speakLabel = speakButton
  ? speakButton.querySelector(".speak-label")
  : null;

function bindDropZone(input, options) {
  if (!input) {
    return;
  }
  const label = input.closest(".file-label");
  if (!label) {
    return;
  }
  const accept = (options && options.accept) || function () {
    return true;
  };
  const maxFiles = (options && options.maxFiles) || 1;
  let dragDepth = 0;
  label.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dragDepth += 1;
    label.classList.add("is-drag");
  });
  label.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  });
  label.addEventListener("dragleave", () => {
    dragDepth -= 1;
    if (dragDepth <= 0) {
      dragDepth = 0;
      label.classList.remove("is-drag");
    }
  });
  label.addEventListener("drop", (event) => {
    event.preventDefault();
    dragDepth = 0;
    label.classList.remove("is-drag");
    const dropped = event.dataTransfer && event.dataTransfer.files;
    if (!dropped || !dropped.length) {
      return;
    }
    const files = Array.from(dropped).filter(accept).slice(0, maxFiles);
    if (!files.length) {
      return;
    }
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    input.files = transfer.files;
    input.dispatchEvent(new Event("change"));
  });
}

if (fileInput && fileName) {
  fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files || []).slice(0, 3);
    fileName.textContent = files.length
      ? files.map((file) => file.name).join(", ")
      : t("contract.file");
    if (window.FCUI) {
      window.FCUI.setFileStatus(document.getElementById("file-status"), files, "picked");
    }
  });
  bindDropZone(fileInput, {
    maxFiles: 3,
    accept: (file) => file.type === "application/pdf" || /\.pdf$/i.test(file.name),
  });
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.classList.toggle("is-loading", busy);
  if (busy) {
    button.innerHTML =
      '<span class="btn-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>' +
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
  let title = "";
  let body = cleaned;
  const titled = cleaned.match(/^\*\*(.+?)\*\*\s*[:：.\-–—]?\s*([\s\S]*)$/);
  if (titled && titled[1].trim()) {
    title = titled[1].trim();
    body = titled[2].trim();
  } else {
    const lines = cleaned.split(/\n/);
    const first = (lines[0] || "").replace(/^\*\*|\*\*$/g, "").trim();
    if (lines.length > 1 && first.length && first.length < 72) {
      title = first;
      body = lines.slice(1).join("\n").trim();
    } else {
      title = index === 0 ? t("card.explain") : t("card.item", { n: index + 1 });
      body = cleaned;
    }
  }
  let compliance = "";
  const tag =
    title.match(/\[(Dikkat|Standart|Attention|Standard)\]/i) ||
    body.match(/^\[(Dikkat|Standart|Attention|Standard)\]\s*/i);
  if (tag) {
    const raw = tag[1].toLowerCase();
    compliance = raw === "dikkat" || raw === "attention" ? "Dikkat" : "Standart";
    title = title.replace(/\s*\[(Dikkat|Standart|Attention|Standard)\]\s*/gi, " ").trim();
    body = body.replace(/^\[(Dikkat|Standart|Attention|Standard)\]\s*/i, "").trim();
  }
  return { title, body, compliance };
}

function splitFreshness(answer) {
  const text = String(answer || "").trim();
  const match = text.match(
    /\n+((?:Bu bilgi .+ itibarıyla günceldir|This information is current as of)[^\n]*)$/
  );
  if (!match) {
    return { body: text, note: "" };
  }
  return {
    body: text.slice(0, match.index).trim(),
    note: match[1].trim(),
  };
}

function parseInsightCards(answer) {
  const split = splitFreshness(answer);
  const text = split.body;
  if (!text) {
    return { cards: [], note: split.note };
  }
  const numbered = text
    .split(/(?=^\s*\d+[.)]\s+)/m)
    .map((piece) => piece.trim())
    .filter(Boolean);
  const looksNumbered =
    numbered.length >= 2 ||
    (numbered.length === 1 && /^\d+[.)]\s+/.test(numbered[0]));
  if (looksNumbered) {
    return {
      cards: numbered.map((block, index) =>
        splitTitleBody(block.replace(/^\d+[.)]\s+/, ""), index)
      ),
      note: split.note,
    };
  }
  const boldBlocks = text
    .split(/(?=^\s*\*\*[^*]+\*\*)/m)
    .map((piece) => piece.trim())
    .filter(Boolean);
  if (boldBlocks.length >= 2) {
    return {
      cards: boldBlocks.map((block, index) => splitTitleBody(block, index)),
      note: split.note,
    };
  }
  return { cards: [splitTitleBody(text, 0)], note: split.note };
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
  const parsed = parseInsightCards(answer);
  const cards = parsed.cards || [];
  if (!answerEl) {
    return cards;
  }
  answerEl.innerHTML = "";
  if (!cards.length && !parsed.note) {
    return [];
  }
  const grid = document.createElement("div");
  grid.className = "insight-grid" + (cards.length > 1 ? " is-many" : "");
  cards.forEach((card, index) => {
    const article = document.createElement("article");
    article.className = "insight-card";
    article.dataset.tone = String(index % 5);
    if (card.compliance === "Dikkat") {
      article.classList.add("is-attention");
    }
    const indexEl = document.createElement("span");
    indexEl.className = "insight-index";
    indexEl.textContent = String(index + 1).padStart(2, "0");
    const titleEl = document.createElement("h3");
    titleEl.textContent = card.title;
    if (card.compliance) {
      const tag = document.createElement("span");
      tag.className =
        "compliance-tag" +
        (card.compliance === "Dikkat" ? " is-attention" : " is-standard");
      tag.textContent =
        card.compliance === "Dikkat" ? t("tag.attention") : t("tag.standard");
      titleEl.appendChild(document.createTextNode(" "));
      titleEl.appendChild(tag);
    }
    const bodyEl = document.createElement("p");
    appendRichText(bodyEl, card.body);
    article.append(indexEl, titleEl, bodyEl);
    grid.appendChild(article);
  });
  if (cards.length) {
    answerEl.appendChild(grid);
  }
  if (parsed.note) {
    const note = document.createElement("p");
    note.className = "freshness-note";
    note.textContent = parsed.note;
    answerEl.appendChild(note);
  }
  return cards;
}

const speaker = {
  cards: [],
  voice: null,
  speaking: false,
  keepAlive: 0,
};

function pickVoice() {
  if (!window.speechSynthesis) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  const prefix = currentLang() === "en" ? "en" : "tr";
  if (prefix === "tr") {
    return (
      voices.find((voice) => (voice.lang || "").toLowerCase().startsWith("tr")) ||
      voices.find((voice) => /turk|türk/i.test(voice.name || "")) ||
      voices.find((voice) => (voice.lang || "").toLowerCase().startsWith("en")) ||
      voices[0] ||
      null
    );
  }
  return (
    voices.find((voice) => (voice.lang || "").toLowerCase().startsWith("en")) ||
    voices[0] ||
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
  speakLabel.textContent = speaking ? t("speak.stop") : t("speak");
}

function clearSpeakingCards() {
  answerEl
    .querySelectorAll(".insight-card.is-speaking")
    .forEach((card) => card.classList.remove("is-speaking"));
}

function stopSpeaking() {
  window.clearInterval(speaker.keepAlive);
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
  window.clearInterval(speaker.keepAlive);
  speaker.keepAlive = window.setInterval(() => {
    if (!window.speechSynthesis.speaking) {
      window.clearInterval(speaker.keepAlive);
      return;
    }
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
  }, 10000);
  const speakNext = () => {
    if (index >= cards.length) {
      window.clearInterval(speaker.keepAlive);
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
    utterance.lang = currentLang() === "en" ? "en-US" : "tr-TR";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    if (speaker.voice) {
      utterance.voice = speaker.voice;
    }
    utterance.onend = () => {
      index += 1;
      speakNext();
    };
    utterance.onerror = (event) => {
      const reason = event && event.error;
      if (reason === "interrupted" || reason === "canceled") {
        return;
      }
      window.clearInterval(speaker.keepAlive);
      clearSpeakingCards();
      setSpeakUi(false);
    };
    window.speechSynthesis.resume();
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
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();
  speaker.voice = pickVoice() || speaker.voice;
  window.setTimeout(() => speakCards(0), 40);
}

if (window.speechSynthesis) {
  speaker.voice = pickVoice();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    speaker.voice = pickVoice() || speaker.voice;
  });
}

if (speakButton) {
  speakButton.addEventListener("click", toggleSpeaking);
}

function showError(message) {
  stopSpeaking();
  if (window.FCUI) {
    window.FCUI.setResultState(document.querySelector(".results"), "error");
  }
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
  answerEl.hidden = !answerEl.innerHTML.trim();
  if (!answerEl.hidden && window.FCAnimations && window.FCAnimations.popResults) {
    window.FCAnimations.popResults(document.querySelector(".results") || answerEl);
  }
  if (speakButton) {
    speakButton.hidden = !speaker.cards.length || !window.speechSynthesis;
  }
  if (window.FCUI) {
    window.FCUI.setResultState(document.querySelector(".results"), "streaming");
    window.FCUI.renderCitations(sourcesEl, sources);
    window.FCUI.streamCards(answerEl, function () {
      window.FCUI.setResultState(document.querySelector(".results"), "ready");
    });
    return;
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

function sourceTypeLabels() {
  return {
    terim_sozlugu: t("src.glossary"),
    sozlesme_maddesi: t("src.clause"),
    tuketici_rehberi: t("src.guide"),
    sozlesme_referans: t("src.ref"),
    mevzuat: t("src.law"),
    kullanici_terim: t("src.userTerm"),
    kullanici_belge: t("src.userDoc"),
    kullanici_gorsel: t("src.userImg"),
    sozlesme: t("src.contract"),
  };
}

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
  const law = sources.find(
    (source) => (source.source_type || source.type) === "mevzuat"
  );
  if (law && !pages.length) {
    const lawLabel = [law.regulation_source, law.regulation_reference]
      .filter(Boolean)
      .join(" ");
    return `📌 Yasal Dayanak: ${lawLabel || law.source_name || law.name}`;
  }
  const primary =
    sources.find((source) => (source.source_type || source.type) === "terim_sozlugu") ||
    sources[0];
  const regulator =
    primary.regulation_source ||
    sources.map((item) => item.regulation_source).find(Boolean) ||
    "";
  const updatedRaw =
    primary.last_updated_date ||
    sources.map((item) => item.last_updated_date).find(Boolean) ||
    "";
  const year = String(updatedRaw).slice(0, 4);
  const updateBit = year ? ` (${t("src.update", { year })})` : "";
  const reference = primary.regulation_reference
    ? ` — ${primary.regulation_reference}`
    : "";

  if (pages.length) {
    const bits = [];
    sources.forEach((source) => {
      if ((source.source_type || source.type) !== "sozlesme") {
        return;
      }
      const name = source.source_name || t("src.contract");
      const page = source.page_number
        ? `${name} — ${t("src.page", { n: source.page_number })}`
        : name;
      if (!bits.includes(page)) {
        bits.push(page);
      }
    });
    if (bits.length) {
      return `${t("src.prefix")}: ${bits.join("; ")}`;
    }
    const pageLabel = pages
      .sort((left, right) => left - right)
      .map((page) => t("src.page", { n: page }))
      .join(", ");
    const head = regulator || t("src.contract");
    return `${t("src.prefix")}: ${head} — ${t("src.contract")}, ${pageLabel}${updateBit}`;
  }
  const name = primary.source_name || primary.name;
  if (!name) {
    return regulator ? `${t("src.prefix")}: ${regulator}${updateBit}` : "";
  }
  const type = primary.source_type || primary.type;
  const label = regulator || sourceTypeLabels()[type] || t("src.prefix");
  return `${t("src.prefix")}: ${label} — ${name}${reference}${updateBit}`;
}

async function parseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || t("ask.unexpected"));
  }
  return data;
}

if (askForm) {
  askForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = questionInput.value.trim();
    if (!question) {
      showError(t("ask.empty"));
      return;
    }

    setBusy(askButton, true, t("ask.thinking"));
    if (statusEl) {
      statusEl.textContent = t("ask.searching");
      statusEl.classList.remove("error");
    }
    if (window.FCUI) {
      window.FCUI.setResultState(document.querySelector(".results"), "loading");
    }

    try {
      const data = await parseJson(
        await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, lang: currentLang() }),
        })
      );
      showAnswer(data.answer, data.sources, t("ask.ready"));
      if (window.FCFeatures) {
        window.FCFeatures.afterAnswer(data.answer);
      }
    } catch (error) {
      showError(t("ask.error"));
    } finally {
      setBusy(askButton, false, t("ask.submit"));
    }
  });
}

if (uploadForm) {
  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const files = Array.from(fileInput.files || []).slice(0, 3);
    if (!files.length) {
      showError(t("contract.nofile"));
      return;
    }
    if ((fileInput.files || []).length > 3) {
      showError(t("contract.tooMany"));
    }

    const body = new FormData();
    files.forEach((file) => body.append("file", file));
    body.append("lang", currentLang());
    setBusy(uploadButton, true, t("contract.busy"));
    if (statusEl) {
      statusEl.textContent = t("contract.extracting");
      statusEl.classList.remove("error");
    }
    if (window.FCUI) {
      window.FCUI.setResultState(document.querySelector(".results"), "loading");
      window.FCUI.setFileStatus(document.getElementById("file-status"), files, "busy");
    }

    try {
      if (window.FCFeatures && window.FCFeatures.isStatementMode()) {
        const scanBody = new FormData();
        scanBody.append("file", files[0]);
        scanBody.append("lang", currentLang());
        setBusy(uploadButton, true, t("statement.busy"));
        const data = await parseJson(
          await fetch("/api/statement/scan", { method: "POST", body: scanBody })
        );
        if (window.FCFeatures.renderFlags) {
          window.FCFeatures.renderFlags(data.flags || [], data.legal_basis || "");
        }
        if (window.FCUI) {
          window.FCUI.renderCitations(sourcesEl, data.sources || []);
          window.FCUI.setFileStatus(document.getElementById("file-status"), files, "ready");
          window.FCUI.setResultState(document.querySelector(".results"), "ready");
        }
        if (statusEl) {
          statusEl.textContent = t("statement.ready");
          statusEl.classList.remove("error");
        }
        if (contractChat) {
          contractChat.hidden = true;
        }
        return;
      }
      const data = await parseJson(
        await fetch("/api/upload-sozlesme", {
          method: "POST",
          body,
        })
      );
      const names = data.filenames || (data.filename ? [data.filename] : []);
      const label = names.length
        ? t("contract.named", { name: names.join(", ") })
        : t("contract.ready");
      showAnswer(data.answer, data.sources, label);
      if (window.FCFeatures) {
        window.FCFeatures.afterAnswer(data.answer);
      }
      if (window.FCUI) {
        window.FCUI.setFileStatus(document.getElementById("file-status"), files, "ready");
      }
      if (compareButton) {
        compareButton.hidden = names.length < 2;
      }
      if (contractChat) {
        contractChat.hidden = false;
      }
    } catch (error) {
      showError(error.message || t("ask.error"));
      if (window.FCUI) {
        window.FCUI.setFileStatus(document.getElementById("file-status"), files, "picked");
      }
    } finally {
      const doneLabel =
        window.FCFeatures && window.FCFeatures.isStatementMode()
          ? t("statement.submit")
          : t("contract.submit");
      setBusy(uploadButton, false, doneLabel);
    }
  });
}

if (compareButton) {
  compareButton.addEventListener("click", async () => {
    const files = Array.from(fileInput.files || []);
    if (files.length < 2) {
      showError(t("contract.compareNeed"));
      return;
    }
    setBusy(compareButton, true, t("contract.compareBusy"));
    try {
      const data = await parseJson(
        await fetch("/api/contract/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang: currentLang() }),
        })
      );
      renderCompareTable(data.filenames || [], data.rows || []);
      if (statusEl) {
        statusEl.textContent = t("contract.compareReady");
        statusEl.classList.remove("error");
      }
      if (contractChat) {
        contractChat.hidden = false;
      }
    } catch (error) {
      showError(error.message || t("ask.error"));
    } finally {
      setBusy(compareButton, false, t("contract.compare"));
    }
  });
}

function renderCompareTable(filenames, rows) {
  if (!answerEl) {
    return;
  }
  stopSpeaking();
  answerEl.hidden = false;
  answerEl.innerHTML = "";
  const table = document.createElement("table");
  table.className = "compare-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  [currentLang() === "en" ? "Topic" : "Başlık"]
    .concat(filenames)
    .concat([t("contract.winner")])
    .forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      headRow.appendChild(th);
    });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const title = document.createElement("td");
    title.textContent = row.title || "";
    tr.appendChild(title);
    (row.values || []).forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    const win = document.createElement("td");
    win.textContent = row.winner || "";
    tr.appendChild(win);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  answerEl.appendChild(table);
  if (sourcesEl) {
    sourcesEl.hidden = true;
    sourcesEl.innerHTML = "";
  }
  if (speakButton) {
    speakButton.hidden = true;
  }
}

if (contractAskForm) {
  contractAskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = (contractQuestion && contractQuestion.value.trim()) || "";
    if (!question) {
      showError(t("ask.empty"));
      return;
    }
    setBusy(contractAskButton, true, t("contract.chatBusy"));
    try {
      const data = await parseJson(
        await fetch("/api/contract/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, lang: currentLang() }),
        })
      );
      showAnswer(data.answer, data.sources, t("contract.chatReady"));
    } catch (error) {
      showError(error.message || t("ask.error"));
    } finally {
      setBusy(contractAskButton, false, t("contract.chatSubmit"));
    }
  });
}

function SpeechToText(options) {
  options = options || {};
  this.button = options.button;
  this.statusEl = options.statusEl;
  this.input = options.input;
  this.listening = false;
  this.opening = false;
  this.recognition = null;
  this.media = { stream: null, recorder: null, chunks: [] };
  if (this.button) {
    this.button.addEventListener("click", (event) => this.toggle(event));
  }
}

SpeechToText.prototype.setStatus = function (message, isError) {
  if (!this.statusEl) {
    return;
  }
  if (!message) {
    this.statusEl.hidden = true;
    this.statusEl.textContent = "";
    this.statusEl.classList.remove("is-error");
    return;
  }
  this.statusEl.hidden = false;
  this.statusEl.textContent = message;
  this.statusEl.classList.toggle("is-error", Boolean(isError));
};

SpeechToText.prototype.setListening = function (listening) {
  this.listening = listening;
  if (!this.button) {
    return;
  }
  this.button.classList.toggle("is-listening", listening);
  this.button.setAttribute("aria-pressed", listening ? "true" : "false");
  this.button.disabled = false;
};

SpeechToText.prototype.fillQuestion = function (text) {
  if (!this.input) {
    return;
  }
  const spoken = (text || "").trim();
  if (!spoken) {
    this.setStatus(t("mic.notUnderstood"), true);
    return;
  }
  const current = this.input.value.trim();
  this.input.value = current ? `${current} ${spoken}` : spoken;
  this.input.dispatchEvent(new Event("input", { bubbles: true }));
  this.setStatus(t("mic.filled"));
};

SpeechToText.prototype.toggle = function (event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (this.listening) {
    this.stop();
    return;
  }
  if (this.opening) {
    return;
  }
  this.startRecording();
};

SpeechToText.prototype.startRecording = async function () {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    this.setStatus(t("mic.unsupported"), true);
    return;
  }
  this.opening = true;
  this.setStatus(t("mic.permission"));
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.opening = false;
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
    recorder.start(250);
    this.setListening(true);
    this.setStatus(t("mic.listening"));
    this.recordTimer = window.setTimeout(() => this.stop(), 20000);
  } catch (error) {
    this.opening = false;
    const denied =
      error &&
      (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
    this.setStatus(
      denied ? t("mic.denied") : t("mic.failed"),
      true
    );
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
    this.setStatus(t("mic.empty"), true);
    return;
  }
  const body = new FormData();
  const extension = blob.type.includes("mp4") ? "m4a" : "webm";
  body.append("audio", blob, `speech.${extension}`);
  body.append("lang", currentLang());
  this.button.disabled = true;
  this.setStatus(t("mic.transcribing"));
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
    this.button.disabled = false;
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

if (micButton && questionInput) {
  new SpeechToText({
    button: micButton,
    statusEl: micStatus,
    input: questionInput,
  });
}
if (contractMicButton && contractQuestion) {
  new SpeechToText({
    button: contractMicButton,
    statusEl: contractMicStatus,
    input: contractQuestion,
  });
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

const kbQueue = document.getElementById("kb-queue");

function kbQueueId(name) {
  return "kbq-" + String(name || "").replace(/[^a-z0-9]+/gi, "-").slice(0, 48);
}

function kbQueueMark(name, state, message) {
  if (!kbQueue || !name) {
    return;
  }
  kbQueue.hidden = false;
  const id = kbQueueId(name);
  let item = document.getElementById(id);
  if (!item) {
    item = document.createElement("li");
    item.id = id;
    item.innerHTML =
      '<span class="kb-queue-name"></span><span class="kb-queue-bar"><i></i></span><span class="kb-queue-state"></span>';
    item.querySelector(".kb-queue-name").textContent = name;
    kbQueue.prepend(item);
  }
  item.className = "kb-queue-item is-" + state;
  const labels = {
    queued: t("kb.queue.wait"),
    busy: t("kb.queue.busy"),
    done: t("kb.queue.done"),
    fail: message || t("kb.queue.fail"),
  };
  item.querySelector(".kb-queue-state").textContent = labels[state] || state;
}

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
      ? t("kb.stats", { n: data.total, parts: parts.join(" · ") })
      : t("kb.empty");
  } catch (error) {
    kbStats.textContent = t("kb.statsFail");
  }
}

if (kbDocFile && kbDocName) {
  kbDocFile.addEventListener("change", () => {
    const files = Array.from(kbDocFile.files || []);
    kbDocName.textContent = files.length
      ? files.map((file) => file.name).join(", ")
      : t("kb.docPick");
    files.forEach((file) => kbQueueMark(file.name, "queued"));
  });
  bindDropZone(kbDocFile, {
    maxFiles: 5,
    accept: (file) =>
      /pdf|plain|markdown/.test(file.type) || /\.(pdf|txt|md)$/i.test(file.name),
  });
}
if (kbImageFile && kbImageName) {
  kbImageFile.addEventListener("change", () => {
    const files = Array.from(kbImageFile.files || []);
    kbImageName.textContent = files.length
      ? files.map((file) => file.name).join(", ")
      : t("kb.imgPick");
    files.forEach((file) => kbQueueMark(file.name, "queued"));
  });
  bindDropZone(kbImageFile, {
    maxFiles: 5,
    accept: (file) =>
      /^image\//.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name),
  });
}

if (termForm) {
  termForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const terim = document.getElementById("term-name").value.trim();
    const aciklama = document.getElementById("term-explain").value.trim();
    if (!terim || !aciklama) {
      showError(t("kb.termRequired"));
      return;
    }
    setBusy(termButton, true, t("kb.saving"));
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
      showAnswer(data.message, [], t("kb.termAdded"));
      termForm.reset();
      refreshStats();
    } catch (error) {
      showError(error.message);
    } finally {
      setBusy(termButton, false, t("kb.saveTerm"));
    }
  });
}

if (docForm) {
  docForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const files = Array.from((kbDocFile && kbDocFile.files) || []);
    if (!files.length) {
      showError(t("kb.docRequired"));
      return;
    }
    setBusy(docButton, true, t("kb.adding"));
    const notes = [];
    try {
      for (const file of files) {
        kbQueueMark(file.name, "busy");
        const body = new FormData();
        body.append("file", file);
        try {
          const data = await parseJson(await fetch("/api/knowledge/document", { method: "POST", body }));
          kbQueueMark(file.name, "done");
          notes.push(data.message);
        } catch (error) {
          kbQueueMark(file.name, "fail", error.message);
          notes.push(error.message);
        }
      }
      showAnswer(notes.join("\n"), [], t("kb.docAdded"));
      docForm.reset();
      kbDocName.textContent = t("kb.docPick");
      refreshStats();
    } catch (error) {
      showError(error.message);
    } finally {
      setBusy(docButton, false, t("kb.docBtn"));
    }
  });
}

if (imageForm) {
  imageForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const files = Array.from((kbImageFile && kbImageFile.files) || []);
    if (!files.length) {
      showError(t("kb.imgRequired"));
      return;
    }
    setBusy(imageButton, true, t("kb.reading"));
    const notes = [];
    try {
      for (const file of files) {
        kbQueueMark(file.name, "busy");
        const body = new FormData();
        body.append("file", file);
        try {
          const data = await parseJson(await fetch("/api/knowledge/image", { method: "POST", body }));
          kbQueueMark(file.name, "done");
          const detail = data.extracted
            ? `${data.message}\n${t("kb.extracted")}\n${data.extracted}`
            : data.message;
          notes.push(detail);
        } catch (error) {
          kbQueueMark(file.name, "fail", error.message);
          notes.push(error.message);
        }
      }
      showAnswer(notes.join("\n\n"), [], t("kb.imgAdded"));
      imageForm.reset();
      kbImageName.textContent = t("kb.imgPick");
      refreshStats();
    } catch (error) {
      showError(error.message);
    } finally {
      setBusy(imageButton, false, t("kb.imgBtn"));
    }
  });
}

refreshStats();

if (questionInput) {
  var pendingQ = new URLSearchParams(window.location.search).get("q");
  if (pendingQ) {
    questionInput.value = pendingQ;
    questionInput.focus();
  }
}

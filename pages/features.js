(function (root) {
  function t(key, vars) {
    return root.I18N && root.I18N.t ? root.I18N.t(key, vars) : key;
  }

  function lang() {
    return root.I18N && root.I18N.lang ? root.I18N.lang() : "tr";
  }

  var lastCompare = { filenames: [], rows: [] };
  var lastPetition = null;
  var lastTopic = { topic: "kart aidatı", clause: "" };
  var placesCache = null;

  function toast(message) {
    var old = document.querySelector(".fc-toast");
    if (old) {
      old.remove();
    }
    var el = document.createElement("div");
    el.className = "fc-toast";
    el.setAttribute("role", "status");
    el.textContent = message;
    document.body.appendChild(el);
    window.setTimeout(function () {
      el.remove();
    }, 3200);
  }

  function parseJson(response) {
    return response.json().catch(function () {
      return {};
    }).then(function (data) {
      if (!response.ok) {
        throw new Error(data.error || t("ask.unexpected"));
      }
      return data;
    });
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 500);
  }

  function bindQuickPrompts() {
    var form = document.getElementById("ask-form");
    var input = document.getElementById("question");
    document.querySelectorAll(".quick-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var key = chip.getAttribute("data-i18n");
        var query =
          (key && t(key) && t(key) !== key ? t(key) : "") ||
          chip.getAttribute("data-q") ||
          chip.textContent.trim();
        if (!input || !form || !query) {
          return;
        }
        input.value = query;
        form.requestSubmit();
      });
    });
  }

  function bindContractTabs() {
    var card = document.getElementById("contract");
    if (!card) {
      return;
    }
    var tabs = card.querySelectorAll("[data-tab]");
    var file = document.getElementById("pdf-file");
    var hint = card.querySelector(".hint");
    var title = document.getElementById("upload-title");
    var button = document.getElementById("upload-button");
    var nameEl = document.getElementById("file-name");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var mode = tab.getAttribute("data-tab") || "contract";
        card.dataset.mode = mode;
        tabs.forEach(function (other) {
          other.classList.toggle("is-on", other === tab);
        });
        if (file) {
          file.accept =
            mode === "statement"
              ? "application/pdf,.pdf,image/png,image/jpeg,image/webp"
              : "application/pdf,.pdf";
          file.multiple = mode !== "statement";
        }
        if (hint) {
          hint.textContent = mode === "statement" ? t("statement.hint") : t("contract.hint");
        }
        if (title) {
          title.textContent = mode === "statement" ? t("statement.title") : t("contract.title");
        }
        if (button) {
          button.textContent = mode === "statement" ? t("statement.submit") : t("contract.submit");
        }
        if (nameEl) {
          nameEl.textContent = mode === "statement" ? t("statement.file") : t("contract.file");
        }
      });
    });
  }

  function setCompareSnapshot(filenames, rows) {
    lastCompare = { filenames: filenames || [], rows: rows || [] };
    var bar = document.getElementById("compare-export");
    if (bar) {
      bar.hidden = !(lastCompare.rows && lastCompare.rows.length);
    }
    maybeShowPetitionFromRows(lastCompare.rows);
  }

  function adverseRow(row) {
    if (!row) {
      return false;
    }
    if (root.FCUI && root.FCUI.riskForRow) {
      return root.FCUI.riskForRow(row).key !== "low";
    }
    return /aidat|cayma|ceza|faiz|dikkat|ücret|ucret/i.test(
      String(row.title || "") + (row.values || []).join(" ")
    );
  }

  function maybeShowPetitionFromRows(rows) {
    var hit = (rows || []).find(adverseRow);
    if (!hit) {
      return;
    }
    lastTopic = {
      topic: hit.title || t("petition.topicDefault"),
      clause: (hit.values || []).filter(Boolean).join(" / "),
    };
    showPetitionCta(lastTopic.topic, lastTopic.clause);
  }

  function afterAnswer(answer) {
    var text = String(answer || "");
    var adverse = /\[dikkat\]|aidat|cayma hakkı|haksız|gecikme faiz/i.test(text);
    if (!adverse) {
      return;
    }
    lastTopic = {
      topic: t("petition.topicDefault"),
      clause: text.slice(0, 400),
    };
    showPetitionCta(lastTopic.topic, lastTopic.clause);
  }

  function showPetitionCta(topic, clause) {
    var host =
      document.getElementById("compare-answer") ||
      document.getElementById("answer") ||
      document.querySelector(".results");
    if (!host) {
      return;
    }
    var box = document.getElementById("petition-cta");
    if (!box) {
      box = document.createElement("div");
      box.id = "petition-cta";
      box.className = "petition-cta";
      host.appendChild(box);
    }
    lastTopic = { topic: topic || lastTopic.topic, clause: clause || lastTopic.clause };
    box.innerHTML = "";
    var p = document.createElement("p");
    p.textContent = t("petition.cta");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = t("petition.button");
    btn.addEventListener("click", function () {
      openPetition(lastTopic.topic, lastTopic.clause);
    });
    box.append(p, btn);
    box.hidden = false;
  }

  function fillPlaceOptions() {
    var provinceEl = document.getElementById("petition-province");
    var placeEl = document.getElementById("petition-place");
    if (!provinceEl || !placeEl) {
      return;
    }
    if (provinceEl.dataset.bound === "1") {
      return;
    }
    provinceEl.dataset.bound = "1";
    provinceEl.addEventListener("change", function () {
      fillDistrictOptions(placesCache || {});
    });
    loadProvinces().then(function (map) {
      if (!Object.keys(map).length) {
        toast(t("petition.placeError"));
      }
      fillProvinceOptions(map);
      fillDistrictOptions(map);
    });
  }

  function loadProvinces() {
    if (placesCache) {
      return Promise.resolve(placesCache);
    }
    return fetch("/api/districts")
      .then(function (response) {
        return response.json();
      })
      .then(function (payload) {
        placesCache = payload.provinces || {};
        return placesCache;
      })
      .catch(function () {
        placesCache = {};
        return placesCache;
      });
  }

  function fillProvinceOptions(map) {
    var select = document.getElementById("petition-province");
    if (!select) {
      return;
    }
    var current = select.value;
    select.innerHTML = "";
    var first = document.createElement("option");
    first.value = "";
    first.textContent = t("petition.provincePh");
    select.appendChild(first);
    Object.keys(map)
      .sort(function (a, b) {
        return a.localeCompare(b, "tr");
      })
      .forEach(function (il) {
        var option = document.createElement("option");
        option.value = il;
        option.textContent = il;
        select.appendChild(option);
      });
    if (current && map[current]) {
      select.value = current;
    }
  }

  function fillDistrictOptions(map) {
    var provinceEl = document.getElementById("petition-province");
    var select = document.getElementById("petition-place");
    if (!select) {
      return;
    }
    var il = (provinceEl && provinceEl.value) || "";
    var current = select.value;
    select.innerHTML = "";
    var first = document.createElement("option");
    first.value = "";
    first.textContent = il ? t("petition.placePh") : t("petition.placeFirst");
    select.appendChild(first);
    select.disabled = !il;
    if (!il) {
      return;
    }
    (map[il] || []).forEach(function (name) {
      var option = document.createElement("option");
      option.value = name;
      option.textContent = name === "Merkez" ? "Merkez (" + il + ")" : name;
      select.appendChild(option);
    });
    if (current) {
      select.value = current;
    }
  }

  function selectedPlace() {
    var il = (document.getElementById("petition-province") || {}).value || "";
    var ilce = (document.getElementById("petition-place") || {}).value || "";
    if (!ilce) {
      return "";
    }
    if (ilce === "Merkez") {
      return il;
    }
    return ilce;
  }

  function bindDatePicker() {
    var dateEl = document.getElementById("petition-date");
    if (!dateEl) {
      return;
    }
    dateEl.addEventListener("pointerdown", function () {
      if (typeof dateEl.showPicker === "function") {
        try {
          dateEl.showPicker();
        } catch (error) {
          dateEl.focus();
        }
      }
    });
  }

  function openPetition(topic, clause) {
    var sheet = document.getElementById("petition-sheet");
    if (!sheet) {
      return;
    }
    lastTopic = { topic: topic || lastTopic.topic, clause: clause || lastTopic.clause };
    var topicEl = document.getElementById("petition-topic");
    var dateEl = document.getElementById("petition-date");
    var preview = document.getElementById("petition-preview");
    if (topicEl) {
      topicEl.textContent = lastTopic.topic;
    }
    if (dateEl && !dateEl.value) {
      dateEl.value = new Date().toISOString().slice(0, 10);
    }
    if (preview) {
      preview.textContent = t("petition.previewHint");
    }
    lastPetition = null;
    sheet.hidden = false;
    document.body.classList.add("sheet-open");
    var bank = document.getElementById("petition-bank");
    if (bank) {
      bank.focus();
    }
  }

  function closePetition() {
    var sheet = document.getElementById("petition-sheet");
    if (sheet) {
      sheet.hidden = true;
    }
    document.body.classList.remove("sheet-open");
  }

  async function buildPetition() {
    var bank = (document.getElementById("petition-bank") || {}).value || "";
    var letterDate = (document.getElementById("petition-date") || {}).value || "";
    var place = selectedPlace();
    var preview = document.getElementById("petition-preview");
    var data = await parseJson(
      await fetch("/api/petition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang: lang(),
          topic: lastTopic.topic,
          clause: lastTopic.clause,
          bank: bank,
          date: letterDate,
          place: place,
        }),
      })
    );
    lastPetition = data;
    lastPetition.bank = bank;
    lastPetition.date = letterDate;
    lastPetition.place = place;
    if (preview) {
      preview.textContent =
        (data.title || "") + "\n\n" + (data.body || "") + "\n\n" + (data.disclaimer || "");
    }
    toast(t("petition.ready"));
  }

  async function downloadPetition() {
    if (!lastPetition) {
      await buildPetition();
    }
    if (!lastPetition) {
      return;
    }
    var response = await fetch("/api/petition/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: lang(),
        bank: lastPetition.bank,
        date: lastPetition.date,
        title: lastPetition.title,
        body: lastPetition.body,
        law_refs: lastPetition.law_refs || [],
      }),
    });
    if (!response.ok) {
      var err = await response.json().catch(function () {
        return {};
      });
      throw new Error(err.error || t("ask.unexpected"));
    }
    downloadBlob(await response.blob(), t("petition.filename"));
  }

  function bindPetitionSheet() {
    var sheet = document.getElementById("petition-sheet");
    if (!sheet) {
      return;
    }
    fillPlaceOptions();
    bindDatePicker();
    sheet.querySelectorAll("[data-sheet-close]").forEach(function (node) {
      node.addEventListener("click", closePetition);
    });
    var build = document.getElementById("petition-build");
    var pdfBtn = document.getElementById("petition-pdf");
    if (build) {
      build.addEventListener("click", function () {
        buildPetition().catch(function (error) {
          toast(error.message || t("ask.error"));
        });
      });
    }
    if (pdfBtn) {
      pdfBtn.addEventListener("click", function () {
        downloadPetition().catch(function (error) {
          toast(error.message || t("ask.error"));
        });
      });
    }
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !sheet.hidden) {
        closePetition();
      }
    });
  }

  async function exportCompare() {
    if (!lastCompare.rows.length) {
      toast(t("export.empty"));
      return;
    }
    var response = await fetch("/api/compare/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: lang(),
        filenames: lastCompare.filenames,
        rows: lastCompare.rows,
      }),
    });
    if (!response.ok) {
      var err = await response.json().catch(function () {
        return {};
      });
      throw new Error(err.error || t("ask.unexpected"));
    }
    downloadBlob(await response.blob(), t("export.filename"));
  }

  async function shareCompare() {
    if (!lastCompare.rows.length) {
      toast(t("export.empty"));
      return;
    }
    var data = await parseJson(
      await fetch("/api/compare/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang: lang(),
          filenames: lastCompare.filenames,
          rows: lastCompare.rows,
        }),
      })
    );
    if (navigator.clipboard && data.url) {
      await navigator.clipboard.writeText(data.url);
    }
    toast(t("export.copied"));
  }

  function bindCompareExport() {
    var pdfBtn = document.getElementById("compare-pdf");
    var shareBtn = document.getElementById("compare-share");
    if (pdfBtn) {
      pdfBtn.addEventListener("click", function () {
        exportCompare().catch(function (error) {
          toast(error.message || t("ask.error"));
        });
      });
    }
    if (shareBtn) {
      shareBtn.addEventListener("click", function () {
        shareCompare().catch(function (error) {
          toast(error.message || t("ask.error"));
        });
      });
    }
  }

  function renderFlags(flags, legalBasis) {
    var host = document.getElementById("answer");
    if (!host) {
      return;
    }
    host.hidden = false;
    var list = document.createElement("div");
    list.className = "flag-list";
    if (legalBasis) {
      var basis = document.createElement("p");
      basis.className = "legal-basis";
      basis.textContent = legalBasis;
      list.appendChild(basis);
    }
    (flags || []).forEach(function (flag) {
      var card = document.createElement("article");
      card.className = "flag-card is-" + (flag.level || "info");
      var h = document.createElement("h3");
      h.textContent = flag.title || "";
      var p = document.createElement("p");
      p.textContent = flag.detail || "";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = t("petition.short");
      btn.addEventListener("click", function () {
        openPetition(flag.topic || flag.title, flag.detail || "");
      });
      card.append(h, p, btn);
      list.appendChild(card);
    });
    host.innerHTML = "";
    host.appendChild(list);
    if (flags && flags.length) {
      lastTopic = {
        topic: flags[0].topic || flags[0].title,
        clause: flags[0].detail || "",
      };
      showPetitionCta(lastTopic.topic, lastTopic.clause);
    }
  }

  async function loadSharedCompare() {
    var params = new URLSearchParams(window.location.search);
    var shareId = params.get("id");
    if (!shareId || !document.getElementById("compare-result")) {
      return;
    }
    try {
      var data = await parseJson(await fetch("/api/compare/share/" + encodeURIComponent(shareId)));
      lastCompare = { filenames: data.filenames || [], rows: data.rows || [] };
      if (root.FCCompare && root.FCCompare.render) {
        root.FCCompare.render(lastCompare.filenames, lastCompare.rows);
      }
      var statusEl = document.getElementById("compare-status");
      var resultEl = document.getElementById("compare-result");
      if (resultEl) {
        resultEl.hidden = false;
      }
      if (statusEl) {
        statusEl.textContent = t("export.shared");
      }
      var bar = document.getElementById("compare-export");
      if (bar) {
        bar.hidden = false;
      }
      maybeShowPetitionFromRows(lastCompare.rows);
    } catch (error) {
      toast(error.message || t("export.expired"));
    }
  }

  root.FCFeatures = {
    toast: toast,
    afterAnswer: afterAnswer,
    setCompareSnapshot: setCompareSnapshot,
    renderFlags: renderFlags,
    isStatementMode: function () {
      var card = document.getElementById("contract");
      return Boolean(card && card.dataset.mode === "statement");
    },
  };

  bindQuickPrompts();
  bindContractTabs();
  bindPetitionSheet();
  bindCompareExport();
  loadSharedCompare();
})(window);

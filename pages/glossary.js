(function () {
  var grid = document.getElementById("glossary-grid");
  var search = document.getElementById("glossary-q");
  var countEl = document.getElementById("glossary-count");
  var filters = document.querySelectorAll(".glossary-filters [data-kind]");
  var sheet = document.getElementById("glossary-sheet");
  var sheetTitle = document.getElementById("sheet-title");
  var sheetBody = document.getElementById("sheet-body");
  var sheetLegal = document.getElementById("sheet-legal");
  var sheetBadge = document.getElementById("sheet-badge");
  var sheetAsk = document.getElementById("sheet-ask");
  if (!grid) {
    return;
  }

  var kind = "all";
  var timer = 0;
  var lastFocus = null;

  function t(key, vars) {
    return window.I18N && window.I18N.t ? window.I18N.t(key, vars) : key;
  }

  function typeLabel(type) {
    if (type === "sozlesme_maddesi") {
      return t("src.clause");
    }
    if (type === "tuketici_rehberi") {
      return t("src.guide");
    }
    if (type === "kullanici_terim") {
      return t("src.userTerm");
    }
    return t("src.glossary");
  }

  function badgeClass(type) {
    if (type === "sozlesme_maddesi") {
      return "is-clause";
    }
    if (type === "tuketici_rehberi") {
      return "is-guide";
    }
    if (type === "kullanici_terim") {
      return "is-user";
    }
    return "is-term";
  }

  function legalBits(item) {
    var bits = [];
    if (item.regulation_source) {
      bits.push(item.regulation_source);
    }
    if (item.last_updated_date) {
      bits.push(t("src.update", { year: String(item.last_updated_date).slice(0, 4) }));
    }
    if (item.regulation_reference) {
      bits.push(item.regulation_reference);
    }
    return bits;
  }

  function closeSheet() {
    if (!sheet || sheet.hidden) {
      return;
    }
    sheet.hidden = true;
    document.body.classList.remove("sheet-open");
    if (lastFocus && lastFocus.focus) {
      lastFocus.focus();
    }
  }

  function openSheet(item, trigger) {
    if (!sheet) {
      return;
    }
    lastFocus = trigger || document.activeElement;
    sheetBadge.className = "glossary-badge " + badgeClass(item.source_type);
    sheetBadge.textContent = typeLabel(item.source_type);
    sheetTitle.textContent = item.name || "";
    sheetBody.textContent = item.detail || item.preview || "";
    var bits = legalBits(item);
    sheetLegal.hidden = !bits.length;
    sheetLegal.innerHTML = "";
    if (bits.length) {
      var label = document.createElement("p");
      label.className = "sheet-legal-kicker";
      label.textContent = t("glossary.sheet.legal");
      var refs = document.createElement("p");
      refs.textContent = bits.join(" · ");
      sheetLegal.append(label, refs);
    }
    sheetAsk.href = "/?q=" + encodeURIComponent(item.name || "");
    sheet.hidden = false;
    document.body.classList.add("sheet-open");
    var closeBtn = sheet.querySelector(".sheet-close");
    if (closeBtn) {
      closeBtn.focus();
    }
  }

  function render(items) {
    grid.innerHTML = "";
    if (!items.length) {
      countEl.textContent = t("glossary.empty");
      return;
    }
    countEl.textContent = t("glossary.count", { n: items.length });
    items.forEach(function (item, index) {
      var article = document.createElement("article");
      article.className = "glossary-card";
      article.style.setProperty("--d", (index % 6) * 50 + "ms");
      var badge = document.createElement("span");
      badge.className = "glossary-badge " + badgeClass(item.source_type);
      badge.textContent = typeLabel(item.source_type);
      var title = document.createElement("h3");
      title.textContent = item.name || "";
      var body = document.createElement("p");
      body.textContent = item.preview || "";
      var ask = document.createElement("button");
      ask.type = "button";
      ask.className = "glossary-ask";
      ask.textContent = t("glossary.ask");
      ask.addEventListener("click", function () {
        openSheet(item, ask);
      });
      article.append(badge, title, body, ask);
      grid.appendChild(article);
    });
  }

  function load() {
    var params = new URLSearchParams();
    params.set("kind", kind);
    var query = (search && search.value ? search.value : "").trim();
    if (query) {
      params.set("q", query);
    }
    countEl.textContent = t("glossary.loading");
    fetch("/api/glossary?" + params.toString())
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) {
            throw new Error(data.error || t("glossary.error"));
          }
          return data;
        });
      })
      .then(function (data) {
        render(data.items || []);
      })
      .catch(function (error) {
        grid.innerHTML = "";
        countEl.textContent = error.message || t("glossary.error");
      });
  }

  filters.forEach(function (button) {
    button.addEventListener("click", function () {
      kind = button.getAttribute("data-kind") || "all";
      filters.forEach(function (other) {
        other.classList.toggle("is-on", other === button);
      });
      load();
    });
  });

  if (search) {
    search.addEventListener("input", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(load, 220);
    });
  }

  if (sheet) {
    sheet.querySelectorAll("[data-sheet-close]").forEach(function (node) {
      node.addEventListener("click", closeSheet);
    });
  }
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeSheet();
    }
  });

  load();
})();

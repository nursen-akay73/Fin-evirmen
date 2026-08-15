(function () {
  var grid = document.getElementById("glossary-grid");
  var search = document.getElementById("glossary-q");
  var countEl = document.getElementById("glossary-count");
  var filters = document.querySelectorAll(".glossary-filters [data-kind]");
  if (!grid) {
    return;
  }

  var kind = "all";
  var timer = 0;

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

  function render(items) {
    grid.innerHTML = "";
    if (!items.length) {
      countEl.textContent = t("glossary.empty");
      return;
    }
    countEl.textContent = t("glossary.count", { n: items.length });
    items.forEach(function (item, index) {
      var article = document.createElement("article");
      article.className = "insight-card glossary-card";
      article.dataset.tone = String(index % 5);
      var typeEl = document.createElement("span");
      typeEl.className = "insight-index";
      typeEl.textContent = typeLabel(item.source_type);
      var title = document.createElement("h3");
      title.textContent = item.name || "";
      var body = document.createElement("p");
      body.textContent = item.preview || "";
      var meta = document.createElement("p");
      meta.className = "glossary-meta";
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
      meta.textContent = bits.join(" · ");
      var ask = document.createElement("a");
      ask.className = "glossary-ask";
      ask.href = "/?q=" + encodeURIComponent(item.name || "");
      ask.setAttribute("data-transition", "");
      ask.textContent = t("glossary.ask");
      article.append(typeEl, title, body);
      if (bits.length) {
        article.appendChild(meta);
      }
      article.appendChild(ask);
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

  load();
})();

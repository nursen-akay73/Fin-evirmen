(function (root) {
  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function t(key, vars) {
    return root.I18N && root.I18N.t ? root.I18N.t(key, vars) : key;
  }

  function formatBytes(bytes) {
    var n = Number(bytes) || 0;
    if (n < 1024) {
      return n + " B";
    }
    if (n < 1048576) {
      return (n / 1024).toFixed(1) + " KB";
    }
    return (n / 1048576).toFixed(1) + " MB";
  }

  function setResultState(rootEl, state) {
    var box = rootEl || document.querySelector(".results");
    if (!box) {
      return;
    }
    box.dataset.state = state || "empty";
  }

  function streamText(target, text, onDone) {
    if (!target) {
      if (onDone) {
        onDone();
      }
      return;
    }
    var html = target.innerHTML;
    var full = String(text || target.textContent || "");
    if (reducedMotion() || full.length < 12) {
      if (onDone) {
        onDone();
      }
      return;
    }
    var words = full.split(/(\s+)/);
    target.textContent = "";
    var caret = document.createElement("span");
    caret.className = "stream-caret";
    caret.setAttribute("aria-hidden", "true");
    target.appendChild(caret);
    var index = 0;
    function tick() {
      if (index >= words.length) {
        caret.remove();
        target.innerHTML = html;
        if (onDone) {
          onDone();
        }
        return;
      }
      caret.before(document.createTextNode(words[index]));
      index += 1;
      window.setTimeout(tick, words[index - 1].trim() ? 22 : 8);
    }
    tick();
  }

  function streamCards(container, onDone) {
    var bodies = container ? container.querySelectorAll(".insight-card p") : [];
    if (!bodies.length) {
      if (onDone) {
        onDone();
      }
      return;
    }
    var i = 0;
    function next() {
      if (i >= bodies.length) {
        if (onDone) {
          onDone();
        }
        return;
      }
      var el = bodies[i];
      i += 1;
      streamText(el, el.textContent, next);
    }
    next();
  }

  function sourceHeading(source) {
    var name = source.source_name || source.name || t("src.prefix");
    var page = source.page_number ? " · " + t("src.page", { n: source.page_number }) : "";
    var ref = source.regulation_reference ? " / " + source.regulation_reference : "";
    var regulator = source.regulation_source ? source.regulation_source + " · " : "";
    return "📌 " + t("src.prefix") + ": " + regulator + name + ref + page;
  }

  function renderCitations(listEl, sources) {
    if (!listEl) {
      return;
    }
    listEl.innerHTML = "";
    if (!sources || !sources.length) {
      listEl.hidden = true;
      return;
    }
    listEl.hidden = false;
    sources.forEach(function (source, index) {
      var item = document.createElement("li");
      var details = document.createElement("details");
      if (index === 0) {
        details.open = true;
      }
      var summary = document.createElement("summary");
      summary.textContent = sourceHeading(source);
      var pre = document.createElement("pre");
      pre.className = "cite-snippet";
      pre.textContent = source.snippet || t("src.noSnippet");
      details.append(summary, pre);
      item.appendChild(details);
      listEl.appendChild(item);
    });
  }

  function missingValue(value) {
    var text = String(value || "").trim().toLowerCase();
    if (!text) {
      return true;
    }
    return /yok|bulunamad|belirtilmem|not (in|found)|n\/a|none|—|–/.test(text);
  }

  function topicBadge(title) {
    var raw = String(title || "").toLowerCase();
    if (/faiz|interest|apr|oran/.test(raw)) {
      return t("topic.interest");
    }
    if (/cayma|withdrawal|iptal|cancel/.test(raw)) {
      return t("topic.cancel");
    }
    if (/ücret|ucret|fee|masraf|komisyon|gizli/.test(raw)) {
      return t("topic.fee");
    }
    if (/asgari|minimum/.test(raw)) {
      return t("topic.min");
    }
    if (/ceza|penalty/.test(raw)) {
      return t("topic.penalty");
    }
    return "";
  }

  function riskForRow(row) {
    var values = row.values || [];
    var missing = values.filter(missingValue).length;
    if (missing === values.length && values.length) {
      return { key: "high", label: t("risk.high") };
    }
    if (missing > 0 || /dikkat|eksik|yüksek/i.test(String(row.title || "") + values.join(" "))) {
      return { key: "watch", label: t("risk.watch") };
    }
    return { key: "low", label: t("risk.low") };
  }

  function setFileStatus(rootEl, files, state) {
    if (!rootEl) {
      return;
    }
    var list = Array.from(files || []).filter(Boolean);
    if (!list.length) {
      rootEl.hidden = true;
      rootEl.classList.remove("is-busy", "is-ready");
      return;
    }
    var nameEl = rootEl.querySelector("[data-file-name]");
    var sizeEl = rootEl.querySelector("[data-file-size]");
    var badgeEl = rootEl.querySelector("[data-file-badge]");
    if (nameEl) {
      nameEl.textContent = list.map(function (file) {
        return file.name;
      }).join(", ");
    }
    if (sizeEl) {
      var total = list.reduce(function (sum, file) {
        return sum + (file.size || 0);
      }, 0);
      sizeEl.textContent = formatBytes(total);
    }
    rootEl.hidden = false;
    rootEl.classList.toggle("is-busy", state === "busy");
    rootEl.classList.toggle("is-ready", state === "ready");
    if (badgeEl) {
      badgeEl.textContent =
        state === "ready" ? t("file.ready") : state === "busy" ? t("file.busy") : t("file.picked");
    }
  }

  root.FCUI = {
    formatBytes: formatBytes,
    setResultState: setResultState,
    streamText: streamText,
    streamCards: streamCards,
    renderCitations: renderCitations,
    missingValue: missingValue,
    topicBadge: topicBadge,
    riskForRow: riskForRow,
    setFileStatus: setFileStatus,
  };
})(window);

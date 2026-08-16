(function () {
  function currentLang() {
    return window.I18N && window.I18N.lang ? window.I18N.lang() : "tr";
  }

  function t(key, vars) {
    return window.I18N && window.I18N.t ? window.I18N.t(key, vars) : key;
  }

  var files = { a: null, b: null };
  var runButton = document.getElementById("compare-run");
  var shell = document.querySelector(".compare-shell");
  var resultEl = document.getElementById("compare-result");
  var statusEl = document.getElementById("compare-status");
  var answerEl = document.getElementById("compare-answer");
  var slots = document.querySelectorAll(".compare-slot");

  function setBusy(button, busy, label) {
    button.disabled = busy || !files.a || !files.b;
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

  async function parseJson(response) {
    var data = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      throw new Error(data.error || t("ask.unexpected"));
    }
    return data;
  }

  function isPdf(file) {
    if (!file) {
      return false;
    }
    var name = (file.name || "").toLowerCase();
    return file.type === "application/pdf" || name.endsWith(".pdf");
  }

  function setSlotFile(key, file) {
    var slot = document.querySelector('[data-slot="' + key + '"]');
    var nameEl = document.querySelector('[data-name="' + key + '"]');
    if (!file) {
      files[key] = null;
      if (slot) {
        slot.classList.remove("has-file");
      }
      if (nameEl) {
        nameEl.textContent = t("compare.drop");
      }
      syncButton();
      return;
    }
    if (!isPdf(file)) {
      showError(t("contract.nofile"));
      return;
    }
    files[key] = file;
    if (slot) {
      slot.classList.add("has-file");
    }
    if (nameEl) {
      nameEl.textContent = file.name;
    }
    syncButton();
  }

  function syncButton() {
    if (!runButton) {
      return;
    }
    runButton.disabled = !(files.a && files.b);
  }

  function showError(message) {
    if (shell) {
      shell.classList.add("has-result");
    }
    if (resultEl) {
      resultEl.hidden = false;
    }
    if (answerEl) {
      answerEl.hidden = true;
      answerEl.innerHTML = "";
    }
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.classList.add("error");
    }
    if (window.FCFeatures) {
      window.FCFeatures.setCompareSnapshot([], []);
    }
  }

  function winnerKind(winner, filenames) {
    var raw = String(winner || "").trim().toLowerCase();
    if (!raw || raw === "eşit" || raw === "esit" || raw === "tie" || raw === "equal") {
      return { tie: true, index: -1 };
    }
    var index = filenames.findIndex(function (name) {
      return String(name || "").trim().toLowerCase() === raw;
    });
    return { tie: index < 0, index: index };
  }

  function renderTable(filenames, rows) {
    if (!answerEl) {
      return;
    }
    answerEl.hidden = false;
    answerEl.innerHTML = "";
    if (window.FCUI) {
      renderCards(filenames, rows);
      return;
    }
    var table = document.createElement("table");
    table.className = "compare-table";
    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    [currentLang() === "en" ? "Topic" : "Başlık"]
      .concat(filenames)
      .concat([t("contract.winner")])
      .forEach(function (label) {
        var th = document.createElement("th");
        th.textContent = label;
        headRow.appendChild(th);
      });
    thead.appendChild(headRow);
    table.appendChild(thead);
    var tbody = document.createElement("tbody");
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      var title = document.createElement("td");
      title.textContent = row.title || "";
      tr.appendChild(title);
      var kind = winnerKind(row.winner, filenames);
      (row.values || []).forEach(function (value, index) {
        var td = document.createElement("td");
        td.textContent = value;
        if (!kind.tie && kind.index === index) {
          td.className = "is-winner";
        }
        tr.appendChild(td);
      });
      var win = document.createElement("td");
      win.textContent = row.winner || "";
      win.className = kind.tie ? "is-tie" : "is-winner";
      tr.appendChild(win);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    answerEl.appendChild(table);
  }

  function renderCards(filenames, rows) {
    var wrap = document.createElement("div");
    wrap.className = "compare-cards";
    (rows || []).forEach(function (row) {
      var risk = window.FCUI.riskForRow(row);
      var topic = window.FCUI.topicBadge(row.title);
      var card = document.createElement("article");
      card.className = "compare-card";
      if (risk.key !== "low") {
        card.classList.add("is-missing");
      }
      var head = document.createElement("div");
      head.className = "compare-card-head";
      var title = document.createElement("h3");
      title.textContent = row.title || "";
      head.appendChild(title);
      if (topic) {
        var topicEl = document.createElement("span");
        topicEl.className = "badge is-topic";
        topicEl.textContent = topic;
        head.appendChild(topicEl);
      }
      var riskEl = document.createElement("span");
      riskEl.className = "badge is-" + risk.key;
      riskEl.textContent = risk.label;
      head.appendChild(riskEl);
      card.appendChild(head);
      var pair = document.createElement("div");
      pair.className = "compare-pair";
      (row.values || []).forEach(function (value, index) {
        var cell = document.createElement("p");
        if (window.FCUI.missingValue(value)) {
          cell.className = "is-missing";
        }
        var kicker = document.createElement("span");
        kicker.className = "pair-kicker";
        kicker.textContent = filenames[index] || (index === 0 ? "A" : "B");
        cell.appendChild(kicker);
        cell.appendChild(document.createTextNode(value || t("risk.missing")));
        pair.appendChild(cell);
      });
      card.appendChild(pair);
      wrap.appendChild(card);
    });
    answerEl.appendChild(wrap);
  }

  window.FCCompare = {
    render: renderTable,
  };

  slots.forEach(function (slot) {
    var key = slot.getAttribute("data-slot");
    var input = slot.querySelector("input[type='file']");
    if (input) {
      input.addEventListener("change", function () {
        setSlotFile(key, input.files && input.files[0]);
      });
    }
    slot.addEventListener("dragover", function (event) {
      event.preventDefault();
      slot.classList.add("is-drag");
    });
    slot.addEventListener("dragleave", function () {
      slot.classList.remove("is-drag");
    });
    slot.addEventListener("drop", function (event) {
      event.preventDefault();
      slot.classList.remove("is-drag");
      var dropped = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (dropped && input) {
        try {
          var transfer = new DataTransfer();
          transfer.items.add(dropped);
          input.files = transfer.files;
        } catch (error) {
          /* keep in-memory file even if input cannot be set */
        }
      }
      setSlotFile(key, dropped);
    });
  });

  if (runButton) {
    runButton.addEventListener("click", async function () {
      if (!files.a || !files.b) {
        showError(t("contract.compareNeed"));
        return;
      }
      setBusy(runButton, true, t("contract.compareBusy"));
      if (statusEl) {
        statusEl.textContent = t("compare.working");
        statusEl.classList.remove("error");
      }
      if (resultEl) {
        resultEl.hidden = false;
      }
      if (shell) {
        shell.classList.add("has-result");
      }
      try {
        var body = new FormData();
        body.append("file", files.a);
        body.append("file", files.b);
        body.append("lang", currentLang());
        body.append("skip_summary", "1");
        await parseJson(
          await fetch("/api/upload-sozlesme", {
            method: "POST",
            body: body,
          })
        );
        var data = await parseJson(
          await fetch("/api/contract/compare", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lang: currentLang() }),
          })
        );
        renderTable(data.filenames || [], data.rows || []);
        if (window.FCFeatures) {
          window.FCFeatures.setCompareSnapshot(data.filenames || [], data.rows || []);
        }
        if (statusEl) {
          statusEl.textContent = t("contract.compareReady");
          statusEl.classList.remove("error");
        }
      } catch (error) {
        showError(error.message || t("ask.error"));
      } finally {
        setBusy(runButton, false, t("contract.compare"));
      }
    });
  }
})();

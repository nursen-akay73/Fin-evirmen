(function (root) {
  function formatMoney(cents, currency) {
    var amount = (Number(cents || 0) / 100).toFixed(2);
    return amount + " " + (currency || "TRY");
  }

  function parseJson(response) {
    return response.json().then(function (data) {
      if (!response.ok) {
        throw new Error(data.error || "İstek başarısız.");
      }
      return data;
    });
  }

  function setStatus(node, message, isError) {
    if (!node) {
      return;
    }
    node.textContent = message || "";
    node.classList.toggle("is-error", Boolean(isError));
  }

  function attachNarrationMic(button, textarea, statusEl) {
    if (!button || !textarea) {
      return;
    }
    var state = { listening: false, media: null, timer: null, opening: false };

    function setListening(on) {
      state.listening = on;
      button.classList.toggle("is-listening", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    }

    function fill(text) {
      var spoken = (text || "").trim();
      if (!spoken) {
        setStatus(statusEl, "Konuşma anlaşılamadı.", true);
        if (statusEl) statusEl.hidden = false;
        return;
      }
      var current = textarea.value.trim();
      textarea.value = current ? current + " " + spoken : spoken;
      setStatus(statusEl, "Metne çevrildi. Dağılımı oluştur’a basın.");
      if (statusEl) statusEl.hidden = false;
    }

    function stop() {
      window.clearTimeout(state.timer);
      if (state.media && state.media.recorder && state.media.recorder.state !== "inactive") {
        state.media.recorder.stop();
      }
      setListening(false);
    }

    function startRecording() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus(statusEl, "Bu tarayıcı mikrofonu desteklemiyor. Chrome deneyin.", true);
        if (statusEl) statusEl.hidden = false;
        return;
      }
      if (state.opening || state.listening) {
        return;
      }
      state.opening = true;
      setStatus(statusEl, "Tarayıcı mikrofon izni istiyor… adres çubuğundan İzin ver’e basın.");
      if (statusEl) statusEl.hidden = false;
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        state.opening = false;
        var mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : MediaRecorder.isTypeSupported("audio/mp4")
              ? "audio/mp4"
              : "";
        var recorder = mimeType
          ? new MediaRecorder(stream, { mimeType: mimeType })
          : new MediaRecorder(stream);
        var chunks = [];
        state.media = { stream: stream, recorder: recorder, chunks: chunks };
        recorder.ondataavailable = function (event) {
          if (event.data && event.data.size) {
            chunks.push(event.data);
          }
        };
        recorder.onstop = function () {
          stream.getTracks().forEach(function (track) {
            track.stop();
          });
          var blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          var filename = blob.type.indexOf("mp4") !== -1 ? "speech.m4a" : "speech.webm";
          var body = new FormData();
          body.append("audio", blob, filename);
          body.append("lang", window.I18N && window.I18N.lang ? window.I18N.lang() : "tr");
          setStatus(statusEl, "Ses metne çevriliyor…");
          if (statusEl) statusEl.hidden = false;
          fetch("/api/transcribe", { method: "POST", body: body })
            .then(parseJson)
            .then(function (data) {
              fill(data.text);
            })
            .catch(function (error) {
              setStatus(statusEl, error.message, true);
            });
        };
        recorder.start(250);
        setListening(true);
        setStatus(statusEl, "Dinleniyor… bitirmek için mikrofona tekrar basın.");
        if (statusEl) statusEl.hidden = false;
        state.timer = window.setTimeout(stop, 20000);
      }).catch(function (error) {
        state.opening = false;
        var denied = error && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
        setStatus(
          statusEl,
          denied
            ? "Mikrofon izni verilmedi. Adres çubuğundaki kilit simgesinden mikrofona izin verin."
            : "Mikrofona erişilemedi. İzin verip tekrar deneyin.",
          true
        );
        if (statusEl) statusEl.hidden = false;
        setListening(false);
      });
    }

    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (state.listening || state.opening) {
        if (state.listening) {
          stop();
        }
        return;
      }
      startRecording();
    });
  }

  function ProjectBrief(mount, projectId) {
    this.mount = mount;
    this.projectId = projectId;
    this.draw();
  }

  ProjectBrief.prototype.draw = function () {
    this.mount.innerHTML =
      '<section class="re-card">' +
      "<h3>Projeyi anlat</h3>" +
      '<p class="hint">Örn. FinÇevirmen satışından 4000 TL geldi. Nurşen developer yüzde 50, Kim lead yüzde 10, Kim2 lead yüzde 40.</p>' +
      '<div class="ask-field">' +
      '<textarea id="revenue-brief-text" rows="5" placeholder="Kimler var, yüzde kaç alıyor, tutar nedir?"></textarea>' +
      '<button type="button" class="mic-button" data-mic aria-label="Sesli anlat" title="Sesli anlat">' +
      '<span class="mic-icon" aria-hidden="true"></span></button>' +
      "</div>" +
      '<p class="mic-status" data-mic-status hidden></p>' +
      '<div class="re-actions"><button type="button" data-apply>Dağılımı oluştur</button></div>' +
      '<p class="re-status" data-status></p>' +
      "</section>";
    var self = this;
    attachNarrationMic(
      this.mount.querySelector("[data-mic]"),
      this.mount.querySelector("#revenue-brief-text"),
      this.mount.querySelector("[data-mic-status]")
    );
    this.mount.querySelector("[data-apply]").addEventListener("click", function () {
      self.apply();
    });
  };

  ProjectBrief.prototype.apply = function () {
    var self = this;
    var text = this.mount.querySelector("#revenue-brief-text").value.trim();
    var status = this.mount.querySelector("[data-status]");
    var button = this.mount.querySelector("[data-apply]");
    if (!text) {
      setStatus(status, "Önce projeyi yazın veya sesle anlatın.", true);
      return;
    }
    button.disabled = true;
    button.textContent = "Okunuyor...";
    fetch("/api/revenue/from-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: this.projectId,
        text: text,
        apply: true,
      }),
    })
      .then(parseJson)
      .then(function (result) {
        var names = (result.extracted.stakeholders || [])
          .map(function (row) {
            return row.name + " %" + row.share_percent;
          })
          .join(" · ");
        var extra = result.split
          ? " Satış bölüştürüldü: " + result.split.amount + " " + result.split.currency + "."
          : " Tutar yoktu; yalnızca oranlar kaydedildi.";
        setStatus(status, "Dolduruldu: " + names + "." + extra);
        if (self.onApplied) {
          self.onApplied(result);
        }
      })
      .catch(function (error) {
        setStatus(status, error.message, true);
      })
      .then(function () {
        button.disabled = false;
        button.textContent = "Dağılımı oluştur";
      });
  };

  function RevenueSplitOverview(mount, projectId) {
    this.mount = mount;
    this.projectId = projectId;
    this.currency = "TRY";
    this.renderSkeleton();
  }

  RevenueSplitOverview.prototype.renderSkeleton = function () {
    this.mount.innerHTML =
      '<section class="re-card">' +
      "<h3>Hakediş özeti</h3>" +
      '<div data-table></div>' +
      '<p class="re-status" data-status></p>' +
      '<div class="re-actions">' +
      '<input data-amount type="number" min="0" step="0.01" placeholder="Satış tutarı" />' +
      '<input data-ref type="text" placeholder="Referans (isteğe bağlı)" />' +
      '<button type="button" data-split>Bölüştür</button>' +
      '<button type="button" class="re-ghost" data-simulate>Simüle et</button>' +
      '<p class="hint">Simüle et sadece hesaplar. Parayı biriktirmek için Bölüştür gerekir.</p>' +
      "</div>" +
      '<div class="re-audit" data-audit></div>' +
      "</section>";
    var self = this;
    this.mount.querySelector("[data-split]").addEventListener("click", function () {
      self.split(false);
    });
    this.mount.querySelector("[data-simulate]").addEventListener("click", function () {
      self.split(true);
    });
  };

  RevenueSplitOverview.prototype.load = function (projectId) {
    var self = this;
    this.projectId = projectId;
    return fetch("/api/revenue/projects/" + projectId + "/shares")
      .then(parseJson)
      .then(function (data) {
        self.currency = data.project.currency;
        self.data = data;
        self.draw(data);
        return data;
      })
      .catch(function (error) {
        setStatus(self.mount.querySelector("[data-status]"), error.message, true);
      });
  };

  RevenueSplitOverview.prototype.draw = function (data) {
    var active = (data.shares || []).filter(function (row) {
      return row.is_active;
    });
    var table = this.mount.querySelector("[data-table]");
    if (!active.length) {
      table.innerHTML = "<p class='hint'>Henüz paydaş yok. Yukarıda projeyi anlatın veya sağdan oran girin.</p>";
      return;
    }
    var body = active
      .map(function (row) {
        return (
          "<tr>" +
          "<td>" +
          row.name +
          (row.role ? " · " + row.role : "") +
          "</td>" +
          "<td>%" +
          Number(row.share_percent).toFixed(2) +
          "</td>" +
          "<td>" +
          formatMoney(row.earned_cents, data.project.currency) +
          "</td>" +
          "<td>" +
          formatMoney(row.available_cents, data.project.currency) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
    table.innerHTML =
      "<table class='re-table'><thead><tr><th>Paydaş</th><th>Pay</th><th>Hak ediş</th><th>Kullanılabilir</th></tr></thead><tbody>" +
      body +
      "</tbody></table>";
    var audits = (data.audits || [])
      .slice(0, 5)
      .map(function (item) {
        return (
          formatMoney(item.amount_cents, item.currency) +
          (item.reference ? " · " + item.reference : "")
        );
      })
      .join(" · ");
    this.mount.querySelector("[data-audit]").textContent = audits
      ? "Son işlemler: " + audits
      : "Henüz bölüştürme yok.";
  };

  RevenueSplitOverview.prototype.setAmount = function (amount, reference) {
    var amountEl = this.mount.querySelector("[data-amount]");
    var refEl = this.mount.querySelector("[data-ref]");
    if (amountEl && amount != null && amount !== "") {
      amountEl.value = amount;
    }
    if (refEl && reference) {
      refEl.value = reference;
    }
  };

  RevenueSplitOverview.prototype.currentRules = function () {
    return ((this.data && this.data.shares) || [])
      .filter(function (row) {
        return row.is_active;
      })
      .map(function (row) {
        return {
          id: row.id,
          name: row.name,
          share_bps: row.share_bps,
        };
      });
  };

  RevenueSplitOverview.prototype.split = function (simulateOnly) {
    var self = this;
    var amount = this.mount.querySelector("[data-amount]").value;
    var reference = this.mount.querySelector("[data-ref]").value;
    var status = this.mount.querySelector("[data-status]");
    if (!amount) {
      setStatus(status, "Tutar girin.", true);
      return;
    }
    var request = simulateOnly
      ? fetch("/api/revenue/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amount,
            currency: this.currency,
            rules: this.currentRules(),
          }),
        })
      : fetch("/api/revenue/split", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: this.projectId,
            amount: amount,
            currency: this.currency,
            reference: reference,
          }),
        });
    request
      .then(parseJson)
      .then(function (result) {
        var summary = result.allocations
          .map(function (item) {
            return item.name + " " + item.amount;
          })
          .join(" · ");
        setStatus(
          status,
          (simulateOnly ? "Simülasyon: " : "Kaydedildi: ") + summary
        );
        if (!simulateOnly) {
          self.load(self.projectId);
          if (self.onChange) {
            self.onChange();
          }
        }
      })
      .catch(function (error) {
        setStatus(status, error.message, true);
      });
  };

  function StakeholderRuleForm(mount, projectId) {
    this.mount = mount;
    this.projectId = projectId;
    this.rows = [{ name: "", role: "", percent: "" }];
    this.draw();
  }

  StakeholderRuleForm.prototype.draw = function () {
    var rowsHtml = this.rows
      .map(function (row, index) {
        return (
          '<div class="re-row" data-index="' +
          index +
          '">' +
          '<input data-name placeholder="Paydaş" value="' +
          (row.name || "") +
          '" />' +
          '<input data-role placeholder="Rol" value="' +
          (row.role || "") +
          '" />' +
          '<input data-percent type="number" min="0" max="100" step="0.01" placeholder="%" value="' +
          (row.percent || "") +
          '" />' +
          "</div>"
        );
      })
      .join("");
    this.mount.innerHTML =
      '<section class="re-card">' +
      "<h3>Paydaş ve oranlar</h3>" +
      "<p class='hint'>Toplam %100 olmalıdır.</p>" +
      '<div data-rows>' +
      rowsHtml +
      "</div>" +
      '<div class="re-actions">' +
      '<button type="button" class="re-ghost" data-add>Paydaş ekle</button>' +
      '<button type="button" data-save>Kuralları kaydet</button>' +
      "</div>" +
      '<p class="re-status" data-status></p>' +
      "</section>";
    var self = this;
    this.mount.querySelector("[data-add]").addEventListener("click", function () {
      self.read();
      self.rows.push({ name: "", role: "", percent: "" });
      self.draw();
    });
    this.mount.querySelector("[data-save]").addEventListener("click", function () {
      self.save();
    });
  };

  StakeholderRuleForm.prototype.read = function () {
    var self = this;
    this.rows = Array.prototype.map.call(
      this.mount.querySelectorAll(".re-row"),
      function (node) {
        return {
          name: node.querySelector("[data-name]").value.trim(),
          role: node.querySelector("[data-role]").value.trim(),
          percent: node.querySelector("[data-percent]").value,
        };
      }
    );
    return this.rows;
  };

  StakeholderRuleForm.prototype.setFromShares = function (shares) {
    var active = (shares || []).filter(function (row) {
      return row.is_active;
    });
    this.rows = active.length
      ? active.map(function (row) {
          return {
            name: row.name,
            role: row.role || "",
            percent: String(row.share_percent),
          };
        })
      : [{ name: "", role: "", percent: "" }];
    this.draw();
  };

  StakeholderRuleForm.prototype.save = function () {
    var self = this;
    var rows = this.read().filter(function (row) {
      return row.name;
    });
    fetch("/api/revenue/projects/" + this.projectId + "/stakeholders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stakeholders: rows.map(function (row) {
          return {
            name: row.name,
            role: row.role,
            share_percent: row.percent,
          };
        }),
      }),
    })
      .then(parseJson)
      .then(function () {
        setStatus(self.mount.querySelector("[data-status]"), "Kurallar kaydedildi.");
        if (self.onChange) {
          self.onChange();
        }
      })
      .catch(function (error) {
        setStatus(self.mount.querySelector("[data-status]"), error.message, true);
      });
  };

  function PayoutRequestModal(mount, projectId) {
    this.mount = mount;
    this.projectId = projectId;
    this.shares = [];
    this.draw();
  }

  PayoutRequestModal.prototype.draw = function () {
    this.mount.innerHTML =
      '<section class="re-card">' +
      "<h3>Hakediş çekimi</h3>" +
      '<div class="re-actions"><button type="button" data-open>Çekim talep et</button></div>' +
      '<p class="re-status" data-status></p>' +
      '<div class="re-modal" hidden data-modal>' +
      '<form class="re-modal-card">' +
      "<h3>Payout talebi</h3>" +
      "<label>Paydaş<select data-holder required></select></label>" +
      '<label>Tutar<input data-amount type="number" min="0.01" step="0.01" required /></label>' +
      '<label>Not<textarea data-note rows="3"></textarea></label>' +
      '<p class="re-status" data-modal-status></p>' +
      '<div class="re-actions">' +
      '<button type="submit">Gönder</button>' +
      '<button type="button" class="re-ghost" data-close>Kapat</button>' +
      "</div></form></div></section>";
    var self = this;
    this.mount.querySelector("[data-open]").addEventListener("click", function () {
      self.mount.querySelector("[data-modal]").hidden = false;
    });
    this.mount.querySelector("[data-close]").addEventListener("click", function () {
      self.mount.querySelector("[data-modal]").hidden = true;
    });
    this.mount.querySelector("form").addEventListener("submit", function (event) {
      event.preventDefault();
      self.submit();
    });
  };

  PayoutRequestModal.prototype.setShares = function (shares, currency) {
    this.shares = (shares || []).filter(function (row) {
      return row.is_active;
    });
    this.currency = currency;
    var select = this.mount.querySelector("[data-holder]");
    select.innerHTML = this.shares
      .map(function (row) {
        return (
          '<option value="' +
          row.id +
          '">' +
          row.name +
          " · " +
          formatMoney(row.available_cents, currency) +
          "</option>"
        );
      })
      .join("");
  };

  PayoutRequestModal.prototype.submit = function () {
    var self = this;
    var status = function (message, isError) {
      setStatus(self.mount.querySelector("[data-status]"), message, isError);
      setStatus(self.mount.querySelector("[data-modal-status]"), message, isError);
    };
    var holderId = Number(this.mount.querySelector("[data-holder]").value);
    var holder = this.shares.filter(function (row) {
      return Number(row.id) === holderId;
    })[0];
    var amount = Number(this.mount.querySelector("[data-amount]").value);
    if (!holder) {
      status("Paydaş seçin.", true);
      return;
    }
    if (!amount || amount <= 0) {
      status("Tutar girin.", true);
      return;
    }
    if (!holder.available_cents) {
      status(
        "Henüz çekilecek bakiye yok. Önce satış tutarını girip Bölüştür’e basın; Simüle et kaydetmez.",
        true
      );
      return;
    }
    fetch("/api/revenue/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: this.projectId,
        stakeholder_id: this.mount.querySelector("[data-holder]").value,
        amount: this.mount.querySelector("[data-amount]").value,
        note: this.mount.querySelector("[data-note]").value,
      }),
    })
      .then(parseJson)
      .then(function () {
        self.mount.querySelector("[data-modal]").hidden = true;
        setStatus(self.mount.querySelector("[data-status]"), "Çekim talebi oluşturuldu.");
        setStatus(self.mount.querySelector("[data-modal-status]"), "");
        if (self.onChange) {
          self.onChange();
        }
      })
      .catch(function (error) {
        status(error.message, true);
      });
  };

  function mountAll(targets) {
    fetch("/api/revenue/projects")
      .then(parseJson)
      .then(function (payload) {
        var projectId = payload.current.id;
        var brief = targets.brief ? new ProjectBrief(targets.brief, projectId) : null;
        var overview = new RevenueSplitOverview(targets.overview, projectId);
        var form = new StakeholderRuleForm(targets.form, projectId);
        var payout = new PayoutRequestModal(targets.payout, projectId);
        function refresh(applied) {
          overview.load(projectId).then(function (data) {
            if (!data) {
              return;
            }
            form.projectId = projectId;
            payout.projectId = projectId;
            if (brief) {
              brief.projectId = projectId;
            }
            form.setFromShares(data.shares);
            payout.setShares(data.shares, data.project.currency);
            if (applied && applied.extracted) {
              overview.setAmount(
                applied.extracted.amount,
                applied.extracted.reference || applied.extracted.project_name
              );
            }
          });
        }
        overview.onChange = refresh;
        form.onChange = refresh;
        payout.onChange = refresh;
        if (brief) {
          brief.onApplied = refresh;
        }
        refresh();
      });
  }

  root.RevenueEngine = {
    ProjectBrief: ProjectBrief,
    RevenueSplitOverview: RevenueSplitOverview,
    StakeholderRuleForm: StakeholderRuleForm,
    PayoutRequestModal: PayoutRequestModal,
    mountAll: mountAll,
  };
})(window);

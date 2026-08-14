(function () {
  var STORAGE_KEY = "fc-transition";

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function ensureVeil() {
    var veil = document.querySelector(".page-veil");
    if (veil) {
      return veil;
    }
    veil = document.createElement("div");
    veil.className = "page-veil";
    veil.setAttribute("aria-hidden", "true");
    veil.innerHTML =
      '<div class="page-veil-panel page-veil-gold">' +
      '<canvas class="page-veil-icons" data-veil-tone="gold" aria-hidden="true"></canvas>' +
      "</div>" +
      '<div class="page-veil-panel page-veil-navy">' +
      '<canvas class="page-veil-icons" data-veil-tone="navy" aria-hidden="true"></canvas>' +
      "</div>";
    document.body.appendChild(veil);
    return veil;
  }

  function startVeilIcons(veil) {
    if (!window.InnerField || !window.InnerField.attachVeil) {
      return;
    }
    veil.querySelectorAll(".page-veil-icons").forEach(function (canvas) {
      window.InnerField.attachVeil(canvas, canvas.getAttribute("data-veil-tone") !== "gold");
    });
  }

  function stopVeilIcons(veil) {
    veil.querySelectorAll(".page-veil-icons").forEach(function (canvas) {
      if (canvas._stopVeil) {
        canvas._stopVeil();
      }
    });
  }

  function splitWords(element) {
    var text = element.textContent.trim();
    element.textContent = "";
    var words = text.split(/\s+/);
    words.forEach(function (word, index) {
      var wrap = document.createElement("span");
      wrap.className = "word-wrap";
      var inner = document.createElement("span");
      inner.className = "word";
      inner.textContent = word;
      wrap.appendChild(inner);
      element.appendChild(wrap);
      if (index < words.length - 1) {
        element.appendChild(document.createTextNode(" "));
      }
    });
    return element.querySelectorAll(".word");
  }

  function playStory() {
    var story = document.querySelector("[data-rag-story]");
    if (!story || !window.gsap) {
      return;
    }
    var title = story.querySelector("[data-split]");
    var words = title ? splitWords(title) : [];
    var items = story.querySelectorAll("[data-story-item]");
    if (reducedMotion()) {
      window.gsap.set([words, items], { clearProps: "all" });
      return;
    }
    window.gsap.set(words, { yPercent: 120 });
    window.gsap.set(items, { y: 36, opacity: 0 });
    window.gsap
      .timeline()
      .to(words, {
        yPercent: 0,
        duration: 0.9,
        stagger: 0.07,
        ease: "power3.out",
      })
      .to(
        items,
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.12,
          ease: "power3.out",
        },
        "-=0.4"
      );
  }

  function playEnter() {
    var veil = ensureVeil();
    var gold = veil.querySelector(".page-veil-gold");
    var navy = veil.querySelector(".page-veil-navy");
    var coming = sessionStorage.getItem(STORAGE_KEY) === "1";
    sessionStorage.removeItem(STORAGE_KEY);

    if (!window.gsap || reducedMotion() || !coming) {
      if (window.gsap) {
        window.gsap.set([gold, navy], { yPercent: -101 });
      }
      stopVeilIcons(veil);
      veil.classList.add("is-idle");
      playStory();
      return;
    }

    startVeilIcons(veil);
    window.gsap.set([gold, navy], { yPercent: 0 });
    window.gsap
      .timeline({
        onComplete: function () {
          stopVeilIcons(veil);
          veil.classList.add("is-idle");
          playStory();
        },
      })
      .to(navy, { yPercent: -101, duration: 0.72, ease: "power3.inOut" }, 0.04)
      .to(gold, { yPercent: -101, duration: 0.72, ease: "power3.inOut" }, 0.16);
  }

  function go(url) {
    if (!window.gsap || reducedMotion()) {
      window.location.href = url;
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, "1");
    var veil = ensureVeil();
    veil.classList.remove("is-idle");
    var gold = veil.querySelector(".page-veil-gold");
    var navy = veil.querySelector(".page-veil-navy");
    startVeilIcons(veil);
    window.gsap.set([gold, navy], { yPercent: 101 });
    window.gsap
      .timeline({
        onComplete: function () {
          window.location.href = url;
        },
      })
      .to(gold, { yPercent: 0, duration: 0.52, ease: "power3.inOut" })
      .to(navy, { yPercent: 0, duration: 0.52, ease: "power3.inOut" }, 0.1);
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[data-transition]");
    if (!link) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (link.target === "_blank") {
      return;
    }
    var url = link.href;
    if (!url || url === window.location.href) {
      return;
    }
    event.preventDefault();
    go(url);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", playEnter);
  } else {
    playEnter();
  }
})();

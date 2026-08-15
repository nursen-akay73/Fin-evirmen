(function () {
  var STORAGE_KEY = "fc-arrive";
  var COINS = ["₺", "$", "€", "£", "₺", "$", "€"];
  var LEFTS = [8, 22, 36, 50, 64, 78, 90];
  var SPEEDS = [520, 580, 460, 640, 500, 560, 480];
  var TAPE =
    "TRY ₺   ·   USD $   ·   EUR €   ·   GBP £   ·   BIST   ·   FX   ·   RAG   ·   FINÇEVIRMEN   ·   ";

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isMobile() {
    return window.matchMedia("(max-width: 900px), (hover: none), (pointer: coarse)").matches;
  }

  function spawnCoins() {
    if (reducedMotion()) {
      return;
    }
    var layer = document.createElement("div");
    layer.className = "coin-flow";
    layer.setAttribute("aria-hidden", "true");
    COINS.forEach(function (symbol, index) {
      var span = document.createElement("span");
      span.textContent = symbol;
      span.style.left = LEFTS[index] + "%";
      span.style.animationDuration = SPEEDS[index] + "ms";
      span.style.animationDelay = index * 40 + "ms";
      span.style.fontSize = 1.8 + (index % 4) * 0.4 + "rem";
      layer.appendChild(span);
    });
    document.body.appendChild(layer);
  }

  function spawnWipe() {
    if (reducedMotion()) {
      return;
    }
    var wrap = document.createElement("div");
    wrap.className = "fc-wipe";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML =
      '<div class="fc-wipe-shutter"></div>' +
      '<div class="fc-wipe-tape"><div class="fc-wipe-tape-track">' +
      TAPE +
      TAPE +
      TAPE +
      "</div></div>";
    document.body.appendChild(wrap);
  }

  function go(url) {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (error) {}
    if (reducedMotion()) {
      window.location.href = url;
      return;
    }
    spawnWipe();
    spawnCoins();
    document.documentElement.classList.add("is-leaving");
    window.setTimeout(function () {
      window.location.href = url;
    }, 420);
  }

  function playEnter() {
    var coming = false;
    try {
      coming = sessionStorage.getItem(STORAGE_KEY) === "1";
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {}
    if (!coming || reducedMotion()) {
      return;
    }
    document.documentElement.classList.add("is-arriving");
    window.setTimeout(function () {
      document.documentElement.classList.remove("is-arriving");
    }, 780);
  }

  function bindTransitions() {
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
      try {
        var next = new URL(url, window.location.href);
        if (next.origin !== window.location.origin) {
          return;
        }
        if (next.pathname === window.location.pathname && next.hash) {
          return;
        }
      } catch (error) {
        return;
      }
      event.preventDefault();
      go(url);
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
    if (document.querySelector("[data-how-showcase]")) {
      return;
    }
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

  function revealSelector() {
    if (document.getElementById("hero")) {
      return "#tools .card, #tools .results, .why-card";
    }
    if (document.querySelector(".how-page")) {
      return ".bento-card, .why-card, .how-flow, .how-close";
    }
    if (document.querySelector(".compare-shell")) {
      return ".compare-intro, .compare-arena, .compare-actions";
    }
    return ".inner-body .page > .card, .inner-body .kb-grid > form, .inner-body .results";
  }

  function revealSections() {
    var nodes = document.querySelectorAll(revealSelector());
    if (!nodes.length) {
      return;
    }
    if (reducedMotion()) {
      nodes.forEach(function (node) {
        node.classList.add("js-reveal", "is-in");
      });
      return;
    }
    nodes.forEach(function (node, index) {
      node.classList.add("js-reveal");
      node.style.setProperty("--stagger", index * 100 + "ms");
    });
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (node) {
        node.classList.add("is-in");
      });
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
    );
    nodes.forEach(function (node) {
      observer.observe(node);
    });
  }

  function bindParallax() {
    var glyphs = document.querySelectorAll(".bg-glyph");
    if (!glyphs.length || reducedMotion() || isMobile()) {
      return;
    }
    var latest = 0;
    var queued = false;
    function tick() {
      queued = false;
      var i;
      for (i = 0; i < glyphs.length; i += 1) {
        var factor = 0.12 + i * 0.04;
        glyphs[i].style.setProperty("--par", (latest * factor).toFixed(1) + "px");
      }
    }
    function onScroll() {
      latest = window.scrollY || 0;
      if (queued) {
        return;
      }
      queued = true;
      window.requestAnimationFrame(tick);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  window.FCAnimations = {
    popResults: function (root) {
      var box = root || document.querySelector(".results") || document.getElementById("answer");
      if (!box || reducedMotion()) {
        return;
      }
      box.classList.remove("is-pop");
      void box.offsetWidth;
      box.classList.add("is-pop");
    },
  };

  function bindNavPill() {
    var nav = document.querySelector("[data-site-tabs]");
    var pill = nav && nav.querySelector("[data-nav-pill]");
    if (!nav || !pill) {
      return;
    }
    var links = nav.querySelectorAll("a");
    if (!links.length) {
      return;
    }

    function currentLink() {
      return nav.querySelector('a[aria-current="page"]');
    }

    function moveTo(link, on) {
      if (!link) {
        pill.classList.remove("is-on");
        return;
      }
      pill.style.setProperty("--pill-x", link.offsetLeft + "px");
      pill.style.setProperty("--pill-w", link.offsetWidth + "px");
      if (on) {
        pill.classList.add("is-on");
      }
    }

    function snap() {
      var current = currentLink();
      if (current) {
        moveTo(current, true);
        return;
      }
      pill.classList.remove("is-on");
    }

    links.forEach(function (link) {
      link.addEventListener("pointerenter", function () {
        moveTo(link, true);
      });
      link.addEventListener("focus", function () {
        moveTo(link, true);
      });
    });
    nav.addEventListener("pointerleave", snap);
    nav.addEventListener("focusout", function (event) {
      if (!nav.contains(event.relatedTarget)) {
        snap();
      }
    });
    window.addEventListener("resize", snap);
    snap();
  }

  bindTransitions();
  bindParallax();

  function start() {
    playEnter();
    playStory();
    revealSections();
    bindNavPill();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

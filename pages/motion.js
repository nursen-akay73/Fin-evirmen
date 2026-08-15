(function () {
  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  function revealInnerPages() {
    if (document.getElementById("hero")) {
      return;
    }
    var nodes = document.querySelectorAll(
      ".inner-body .page > .card, .inner-body .kb-grid > form"
    );
    if (!nodes.length) {
      return;
    }
    nodes.forEach(function (node, index) {
      node.classList.add("js-reveal");
      node.style.setProperty("--stagger", index * 70 + "ms");
    });
    if (reducedMotion() || !("IntersectionObserver" in window)) {
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
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
    );
    nodes.forEach(function (node) {
      observer.observe(node);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", playStory);
  } else {
    playStory();
  }

  revealInnerPages();
})();

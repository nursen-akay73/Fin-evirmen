(function () {
  var RING_EASE = 0.18;
  var DOT_EASE = 0.42;
  var HOVER =
    "a, button, .card, .why-card, .process-card, .compare-slot, .file-label, .glossary-card, .glossary-ask, .insight-card, .story-card, .link-btn, .how-cta, .mic-button, .speak-button, .site-brand, .glossary-filters button, .kb-grid form, .sheet-close, .quick-chip, .tool-tab, .export-btn";
  var TILT = ".page .card, .glossary-card, .insight-card, .story-card, .compare-slot, .kb-grid form";
  var MAGNET = "button:not(.lang-switch):not(:disabled), a.link-btn, a.how-cta, .mic-button";

  var mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  var ring = { x: mouse.x, y: mouse.y };
  var dot = { x: mouse.x, y: mouse.y };
  var rafId = 0;
  var cursor = null;
  var hovering = false;
  var visible = false;

  function closest(node, selector) {
    if (!node) {
      return null;
    }
    if (node.nodeType !== 1) {
      node = node.parentElement;
    }
    return node && node.closest ? node.closest(selector) : null;
  }

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isFinePointer() {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function lerp(current, target, amount) {
    return current + (target - current) * amount;
  }

  function inHeroOrbit(node) {
    return Boolean(node && node.closest && node.closest("[data-orbit-stage], [data-logo-core]"));
  }

  function mount() {
    cursor = document.createElement("div");
    cursor.className = "fc-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML =
      '<span class="fc-cursor-halo"></span>' +
      '<span class="fc-cursor-ring"></span>' +
      '<span class="fc-cursor-dot"></span>';
    document.body.appendChild(cursor);
    document.documentElement.classList.add("has-fc-cursor");
    cursor.classList.add("is-on");
    visible = true;
    document.body.style.cursor = "none";
    document.documentElement.style.cursor = "none";
  }

  function setHover(on) {
    hovering = on;
    if (cursor) {
      cursor.classList.toggle("is-hover", on);
    }
  }

  function loop() {
    ring.x = lerp(ring.x, mouse.x, RING_EASE);
    ring.y = lerp(ring.y, mouse.y, RING_EASE);
    dot.x = lerp(dot.x, mouse.x, DOT_EASE);
    dot.y = lerp(dot.y, mouse.y, DOT_EASE);
    if (cursor) {
      cursor.style.setProperty("--rx", ring.x.toFixed(2) + "px");
      cursor.style.setProperty("--ry", ring.y.toFixed(2) + "px");
      cursor.style.setProperty("--dx", dot.x.toFixed(2) + "px");
      cursor.style.setProperty("--dy", dot.y.toFixed(2) + "px");
    }
    rafId = window.requestAnimationFrame(loop);
  }

  function spark(x, y) {
    var layer = document.createElement("div");
    layer.className = "fc-spark";
    layer.setAttribute("aria-hidden", "true");
    var ring = document.createElement("span");
    ring.className = "fc-spark-ring";
    ring.style.setProperty("--sx", x + "px");
    ring.style.setProperty("--sy", y + "px");
    layer.appendChild(ring);
    document.body.appendChild(layer);
    window.setTimeout(function () {
      layer.remove();
    }, 520);
  }

  function tiltNode(node, event) {
    if (!node || inHeroOrbit(node)) {
      return;
    }
    var rect = node.getBoundingClientRect();
    var px = (event.clientX - rect.left) / rect.width - 0.5;
    var py = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty("--rx", (-py * 7).toFixed(2) + "deg");
    node.style.setProperty("--ry", (px * 9).toFixed(2) + "deg");
    node.classList.add("is-tilting");
  }

  function untilt(node) {
    if (!node) {
      return;
    }
    node.style.setProperty("--rx", "0deg");
    node.style.setProperty("--ry", "0deg");
    node.classList.remove("is-tilting");
  }

  function magnet(node, event) {
    if (!node || node.hasAttribute("data-magnetic") || inHeroOrbit(node)) {
      return;
    }
    var rect = node.getBoundingClientRect();
    var mx = (event.clientX - (rect.left + rect.width / 2)) * 0.22;
    var my = (event.clientY - (rect.top + rect.height / 2)) * 0.22;
    node.style.setProperty("--mx", mx.toFixed(1) + "px");
    node.style.setProperty("--my", my.toFixed(1) + "px");
  }

  function unmagnet(node) {
    if (!node) {
      return;
    }
    node.style.setProperty("--mx", "0px");
    node.style.setProperty("--my", "0px");
  }

  function onMove(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    if (!visible && cursor) {
      visible = true;
      cursor.classList.add("is-on");
    }
    var target = event.target;
    var overText = closest(target, "input, textarea, select, [contenteditable='true']");
    var overHover = !overText && closest(target, HOVER);
    var overField = closest(target, ".fintech-hero, [data-topo]");
    setHover(Boolean(overHover));
    if (cursor) {
      cursor.classList.toggle("is-text", Boolean(overText));
      cursor.classList.toggle("is-field", Boolean(overField) && !overText);
    }

    var tilt = closest(target, TILT);
    if (tilt && !overText) {
      tiltNode(tilt, event);
    }
    var mag = closest(target, MAGNET);
    if (mag && !overText) {
      magnet(mag, event);
    }
  }

  function onOut(event) {
    var fromTilt = closest(event.target, TILT);
    var toTilt = closest(event.relatedTarget, TILT);
    if (fromTilt && fromTilt !== toTilt) {
      untilt(fromTilt);
    }
    var fromMag = closest(event.target, MAGNET);
    var toMag = closest(event.relatedTarget, MAGNET);
    if (fromMag && fromMag !== toMag) {
      unmagnet(fromMag);
    }
  }

  function onDown(event) {
    if (!cursor || event.button !== 0) {
      return;
    }
    cursor.classList.add("is-click");
    var overText = closest(event.target, "input, textarea, select");
    if (!overText) {
      spark(event.clientX, event.clientY);
    }
  }

  function onUp() {
    if (cursor) {
      cursor.classList.remove("is-click");
    }
  }

  function onLeave() {
    if (cursor) {
      cursor.classList.remove("is-on");
      visible = false;
    }
    setHover(false);
  }

  function start() {
    if (reducedMotion() || !isFinePointer()) {
      return;
    }
    mount();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseout", onOut, true);
    rafId = window.requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

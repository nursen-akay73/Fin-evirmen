(function () {
  var RADIUS = 140;
  var STRENGTH = 28;
  var EASE = 0.16;
  var glyphs = [];
  var mouse = { x: -9999, y: -9999 };
  var rafId = 0;
  var queued = false;

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isCoarsePointer() {
    return window.matchMedia("(hover: none), (pointer: coarse)").matches;
  }

  function collect() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-glyph]")).map(
      function (node) {
        return { node: node, x: 0, y: 0, cx: 0, cy: 0 };
      }
    );
  }

  function measure() {
    var i;
    for (i = 0; i < glyphs.length; i += 1) {
      var item = glyphs[i];
      item.node.style.removeProperty("--mx");
      item.node.style.removeProperty("--my");
      var rect = item.node.getBoundingClientRect();
      item.cx = rect.left + rect.width / 2;
      item.cy = rect.top + rect.height / 2;
    }
  }

  function tick() {
    queued = false;
    var moving = false;
    var i;
    for (i = 0; i < glyphs.length; i += 1) {
      var item = glyphs[i];
      var dx = item.cx - mouse.x;
      var dy = item.cy - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 1;
      var targetX = 0;
      var targetY = 0;
      if (dist < RADIUS) {
        var force = ((RADIUS - dist) / RADIUS) * STRENGTH;
        targetX = (dx / dist) * force;
        targetY = (dy / dist) * force;
      }
      item.x += (targetX - item.x) * EASE;
      item.y += (targetY - item.y) * EASE;
      if (Math.abs(item.x) < 0.08 && Math.abs(item.y) < 0.08) {
        item.x = 0;
        item.y = 0;
        item.node.style.setProperty("--mx", "0px");
        item.node.style.setProperty("--my", "0px");
      } else {
        moving = true;
        item.node.style.setProperty("--mx", item.x.toFixed(2) + "px");
        item.node.style.setProperty("--my", item.y.toFixed(2) + "px");
      }
    }
    if (moving) {
      queued = true;
      rafId = window.requestAnimationFrame(tick);
    }
  }

  function requestTick() {
    if (queued) {
      return;
    }
    queued = true;
    rafId = window.requestAnimationFrame(tick);
  }

  function onMove(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    requestTick();
  }

  function onLeave() {
    mouse.x = -9999;
    mouse.y = -9999;
    requestTick();
  }

  function start() {
    glyphs = collect();
    if (!glyphs.length || reducedMotion() || isCoarsePointer()) {
      return;
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

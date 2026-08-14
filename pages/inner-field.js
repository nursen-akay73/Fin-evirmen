(function (root) {
  var body = document.body;
  if (!body) {
    return;
  }

  var isHero = Boolean(document.getElementById("hero"));
  var isStory = body.classList.contains("story-page");
  var isInner = body.classList.contains("inner-body");
  var runField = !isHero && (isStory || isInner);
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dark = isStory;
  var kinds = ["try", "usd", "eur", "doc"];

  function makeIcons(clusterGlow) {
    var spots = clusterGlow
      ? [
          { x: 0.16, y: 0.1, size: 34, d: 0.42 },
          { x: 0.34, y: 0.06, size: 28, d: 0.58 },
          { x: 0.5, y: 0.14, size: 44, d: 0.72 },
          { x: 0.66, y: 0.08, size: 30, d: 0.48 },
          { x: 0.84, y: 0.16, size: 38, d: 0.64 },
          { x: 0.24, y: 0.26, size: 32, d: 0.5 },
          { x: 0.46, y: 0.3, size: 26, d: 0.34 },
          { x: 0.72, y: 0.24, size: 36, d: 0.56 },
          { x: 0.12, y: 0.4, size: 28, d: 0.4 },
          { x: 0.9, y: 0.36, size: 30, d: 0.46 },
          { x: 0.4, y: 0.44, size: 24, d: 0.3 },
          { x: 0.6, y: 0.4, size: 28, d: 0.44 },
        ]
      : [
          { x: 0.06, y: 0.22, size: 64, d: 0.4 },
          { x: 0.94, y: 0.18, size: 72, d: 0.75 },
          { x: 0.05, y: 0.42, size: 56, d: 0.5 },
          { x: 0.95, y: 0.38, size: 60, d: 0.62 },
          { x: 0.07, y: 0.64, size: 68, d: 0.3 },
          { x: 0.93, y: 0.58, size: 54, d: 0.8 },
          { x: 0.04, y: 0.84, size: 58, d: 0.55 },
          { x: 0.96, y: 0.8, size: 66, d: 0.7 },
          { x: 0.14, y: 0.12, size: 48, d: 0.45 },
          { x: 0.86, y: 0.1, size: 50, d: 0.35 },
          { x: 0.12, y: 0.92, size: 52, d: 0.58 },
          { x: 0.88, y: 0.9, size: 46, d: 0.25 },
        ];
    return spots.map(function (item, index) {
      item.kind = kinds[index % kinds.length];
      item.ox = 0;
      item.oy = 0;
      return item;
    });
  }

  function drawIcon(context, kind, x, y, size, alpha, night, onGold) {
    context.save();
    context.translate(x, y);
    context.globalAlpha = alpha;
    var goldGlyph = !onGold;
    if (kind === "doc") {
      var w = size * 0.72;
      var h = size;
      context.fillStyle = goldGlyph
        ? night
          ? "rgba(255, 183, 77, 0.1)"
          : "rgba(255, 253, 248, 0.22)"
        : "rgba(7, 11, 22, 0.12)";
      context.strokeStyle = goldGlyph
        ? night
          ? "rgba(255, 183, 77, 0.78)"
          : "rgba(26, 46, 91, 0.45)"
        : "rgba(26, 46, 91, 0.7)";
      context.lineWidth = 1.6;
      context.beginPath();
      if (context.roundRect) {
        context.roundRect(-w / 2, -h / 2, w, h, 4);
      } else {
        context.rect(-w / 2, -h / 2, w, h);
      }
      context.fill();
      context.stroke();
      context.strokeStyle = goldGlyph ? "rgba(255, 183, 77, 0.85)" : "rgba(26, 46, 91, 0.65)";
      context.lineWidth = 1.4;
      for (var i = 0; i < 4; i += 1) {
        var ly = -h * 0.28 + i * (h * 0.16);
        context.beginPath();
        context.moveTo(-w * 0.28, ly);
        context.lineTo(w * 0.28, ly);
        context.stroke();
      }
    } else {
      var glyph = kind === "try" ? "₺" : kind === "usd" ? "$" : "€";
      context.font = "700 " + size + "px Georgia, serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      if (goldGlyph && !night) {
        context.fillStyle = "rgba(255, 248, 230, 0.7)";
        context.fillText(glyph, 3, 4);
        context.fillStyle = "rgba(26, 46, 91, 0.88)";
      } else {
        context.fillStyle = goldGlyph ? "rgba(7, 11, 22, 0.4)" : "rgba(255, 248, 230, 0.35)";
        context.fillText(glyph, 2, 3);
        context.fillStyle = goldGlyph ? "rgba(255, 183, 77, 0.9)" : "rgba(26, 46, 91, 0.78)";
      }
      context.fillText(glyph, 0, 0);
    }
    context.restore();
  }

  function flee(icons, px, py, width, height) {
    var radius = Math.min(260, Math.max(width, height) * 0.22);
    icons.forEach(function (icon) {
      var ix = icon.x * width + icon.ox;
      var iy = icon.y * height + icon.oy;
      var dx = ix - px;
      var dy = iy - py;
      var dist = Math.hypot(dx, dy) || 1;
      var targetX = 0;
      var targetY = 0;
      if (dist < radius) {
        var force = Math.pow(1 - dist / radius, 2) * (140 + icon.d * 90);
        targetX = (dx / dist) * force;
        targetY = (dy / dist) * force;
      }
      icon.ox += (targetX - icon.ox) * 0.12;
      icon.oy += (targetY - icon.oy) * 0.12;
    });
  }

  function attachVeil(canvas, night) {
    if (!canvas) {
      return;
    }
    if (canvas._stopVeil) {
      canvas._stopVeil();
    }
    var vctx = canvas.getContext("2d");
    var vIcons = makeIcons(true);
    var vx = 0.5;
    var vy = 0.35;
    var raf = 0;
    var goldNight = night !== false;
    function loop(time) {
      var w = canvas.clientWidth || window.innerWidth;
      var h = canvas.clientHeight || window.innerHeight;
      var scale = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.floor(w * scale) || canvas.height !== Math.floor(h * scale)) {
        canvas.width = Math.floor(w * scale);
        canvas.height = Math.floor(h * scale);
      }
      vctx.setTransform(scale, 0, 0, scale, 0, 0);
      vctx.clearRect(0, 0, w, h);
      flee(vIcons, vx * w, vy * h, w, h);
      vIcons.forEach(function (icon, index) {
        var x = icon.x * w + icon.ox + Math.sin(time * 0.0005 + index) * 12;
        var y = icon.y * h + icon.oy + Math.cos(time * 0.0004 + index) * 10;
        drawIcon(vctx, icon.kind, x, y, icon.size, 0.78, goldNight, !goldNight);
      });
      raf = requestAnimationFrame(loop);
    }
    function move(event) {
      vx = event.clientX / Math.max(window.innerWidth, 1);
      vy = event.clientY / Math.max(window.innerHeight, 1);
    }
    window.addEventListener("pointermove", move, { passive: true });
    raf = requestAnimationFrame(loop);
    canvas._stopVeil = function () {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
    };
  }

  root.InnerField = {
    attachVeil: attachVeil,
  };

  if (!runField) {
    return;
  }

  body.classList.add("has-inner-field");
  if (dark) {
    body.classList.add("has-inner-field-dark");
  }

  function makeCanvas(className, alpha) {
    var canvas = document.createElement("canvas");
    canvas.className = className;
    canvas.setAttribute("aria-hidden", "true");
    body.insertBefore(canvas, body.firstChild);
    return {
      el: canvas,
      ctx: canvas.getContext("2d", { alpha: alpha }),
    };
  }

  var field = makeCanvas("inner-field-canvas", false);
  var iconLayer = makeCanvas("inner-field-icons", true);
  var trailLayer = makeCanvas("inner-field-trail", true);
  var ctx = field.ctx;
  var ictx = iconLayer.ctx;
  var tctx = trailLayer.ctx;
  var width = 0;
  var height = 0;
  var dpr = 1;
  var pointer = { x: 0.5, y: 0.22, tx: 0.5, ty: 0.22 };
  var trail = [];
  var lastStamp = 0;
  var scrollY = 0;
  var icons = makeIcons(dark);
  var blobs = dark
    ? [
        { x: 0.52, y: 0.16, r: 0.48, color: [255, 183, 77], a: 0.28, s: 0.00018, p: 0.4 },
        { x: 0.74, y: 0.1, r: 0.36, color: [255, 200, 120], a: 0.2, s: 0.00014, p: 1.8 },
        { x: 0.3, y: 0.22, r: 0.32, color: [255, 183, 77], a: 0.16, s: 0.00016, p: 3.2 },
        { x: 0.62, y: 0.72, r: 0.3, color: [26, 46, 91], a: 0.38, s: 0.0001, p: 4.4 },
      ]
    : [
        { x: 0.2, y: 0.15, r: 0.42, color: [255, 183, 77], a: 0.38, s: 0.00022, p: 0.4 },
        { x: 0.78, y: 0.22, r: 0.48, color: [255, 252, 244], a: 0.5, s: 0.00016, p: 1.6 },
        { x: 0.6, y: 0.78, r: 0.5, color: [26, 46, 91], a: 0.2, s: 0.00012, p: 2.8 },
        { x: 0.18, y: 0.72, r: 0.36, color: [255, 183, 77], a: 0.32, s: 0.0002, p: 3.9 },
      ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    [field.el, iconLayer.el, trailLayer.el].forEach(function (canvas) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
    });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ictx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function paintField(time) {
    if (dark) {
      var night = ctx.createRadialGradient(
        width * 0.55,
        height * 0.16,
        12,
        width * 0.5,
        height * 0.42,
        Math.max(width, height) * 0.95
      );
      night.addColorStop(0, "#5a3d14");
      night.addColorStop(0.18, "#2a1c0c");
      night.addColorStop(0.48, "#0c1428");
      night.addColorStop(1, "#05070e");
      ctx.fillStyle = night;
      ctx.fillRect(0, 0, width, height);
    } else {
      var day = ctx.createRadialGradient(
        width * 0.5,
        height * 1.12,
        20,
        width * 0.5,
        height * 0.28,
        Math.max(width, height)
      );
      day.addColorStop(0, "#f3e6c8");
      day.addColorStop(0.35, "#e2d3b4");
      day.addColorStop(0.7, "#c9b89a");
      day.addColorStop(1, "#9f8b6e");
      ctx.fillStyle = day;
      ctx.fillRect(0, 0, width, height);
    }

    blobs.forEach(function (blob) {
      var x =
        (blob.x + Math.sin(time * blob.s + blob.p) * 0.05 + (pointer.x - 0.5) * 0.08) * width;
      var y =
        (blob.y + Math.cos(time * blob.s * 0.9 + blob.p) * 0.04 + (pointer.y - 0.5) * 0.06) *
          height -
        scrollY * 0.04;
      var radius = blob.r * Math.max(width, height);
      var g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, "rgba(" + blob.color.join(",") + "," + blob.a + ")");
      g.addColorStop(0.55, "rgba(" + blob.color.join(",") + "," + blob.a * 0.28 + ")");
      g.addColorStop(1, "rgba(" + blob.color.join(",") + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function paintIcons(time) {
    ictx.clearRect(0, 0, width, height);
    flee(icons, pointer.x * width, pointer.y * height, width, height);
    icons.forEach(function (icon, index) {
      var x = icon.x * width + icon.ox + Math.sin(time * 0.00045 + index) * 10;
      var y =
        icon.y * height +
        icon.oy +
        Math.cos(time * 0.00038 + index) * 8 -
        scrollY * (0.06 + icon.d * 0.1);
      drawIcon(
        ictx,
        icon.kind,
        x,
        y,
        icon.size,
        dark ? 0.62 + icon.d * 0.22 : 0.92,
        dark,
        false
      );
    });
  }

  function paintTrail() {
    tctx.clearRect(0, 0, width, height);
    if (trail.length < 2) {
      return;
    }
    tctx.lineCap = "round";
    tctx.lineJoin = "round";
    tctx.shadowColor = dark ? "rgba(255, 183, 77, 0.7)" : "rgba(255, 236, 190, 0.9)";
    tctx.shadowBlur = 24;
    for (var i = 1; i < trail.length; i += 1) {
      var a = trail[i - 1];
      var b = trail[i];
      var life = Math.min(a.life, b.life);
      tctx.strokeStyle = "rgba(255, 248, 230, " + life * (dark ? 0.55 : 0.75) + ")";
      tctx.lineWidth = 7 + life * 22;
      tctx.beginPath();
      tctx.moveTo(a.x, a.y);
      tctx.lineTo(b.x, b.y);
      tctx.stroke();
    }
    tctx.shadowBlur = 0;
  }

  function tickTrail() {
    for (var i = trail.length - 1; i >= 0; i -= 1) {
      trail[i].life -= reduced ? 0.04 : 0.012;
      if (trail[i].life <= 0) {
        trail.splice(i, 1);
      }
    }
  }

  function frame(time) {
    pointer.x = lerp(pointer.x, pointer.tx, 0.07);
    pointer.y = lerp(pointer.y, pointer.ty, 0.07);
    paintField(time);
    paintIcons(time);
    paintTrail();
    tickTrail();
    requestAnimationFrame(frame);
  }

  function onMove(event) {
    pointer.tx = event.clientX / Math.max(width, 1);
    pointer.ty = event.clientY / Math.max(height, 1);
    var now = performance.now();
    if (now - lastStamp > 12) {
      trail.push({ x: event.clientX, y: event.clientY, life: 1 });
      if (trail.length > 64) {
        trail.shift();
      }
      lastStamp = now;
    }
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener(
    "scroll",
    function () {
      scrollY = window.scrollY || 0;
    },
    { passive: true }
  );
  requestAnimationFrame(frame);
})(window);

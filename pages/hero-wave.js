(function () {
  var GOLD = [232, 163, 61];
  var SHEEN = [168, 196, 224];

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isMobile() {
    return window.matchMedia("(max-width: 760px)").matches;
  }

  function HeroWave(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.w = 0;
    this.h = 0;
    this.raf = 0;
    this.running = false;
    this.onResize = this.resize.bind(this);
    this.onVis = this.onVisibility.bind(this);
    this.tick = this.tick.bind(this);
  }

  HeroWave.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var mobile = isMobile();
    var dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  HeroWave.prototype.draw = function (now) {
    var ctx = this.ctx;
    var w = this.w;
    var h = this.h;
    var t = now * 0.001;
    var mobile = isMobile();
    var rings = mobile ? 9 : 18;
    var steps = mobile ? 48 : 72;
    var cx = w * 0.36;
    var cy = h * 0.48;
    var maxR = Math.hypot(w, h) * 0.58;
    var spin = t * 0.052;
    var i;
    var s;

    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (i = 0; i < rings; i += 1) {
      var phase = i * 0.43;
      var base = ((i + 1) / rings) * maxR;
      var pulse = Math.sin(t * 0.32 + phase) * (maxR * 0.014);
      ctx.beginPath();
      for (s = 0; s <= steps; s += 1) {
        var theta = (s / steps) * Math.PI * 2 + spin + i * 0.035;
        var bend = Math.sin(theta * 3 + t * 0.22 + phase) * 0.13;
        var radius =
          base + pulse + Math.sin(theta * 2 + t * 0.28 + phase) * (mobile ? 6 : 10);
        var angle = theta + bend;
        var x = cx + Math.cos(angle) * radius;
        var y = cy + Math.sin(angle) * radius;
        if (s === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      var mix = 0.5 + 0.5 * Math.sin(t * 0.25 + phase);
      var r = GOLD[0] + (SHEEN[0] - GOLD[0]) * mix * 0.35;
      var g = GOLD[1] + (SHEEN[1] - GOLD[1]) * mix * 0.35;
      var b = GOLD[2] + (SHEEN[2] - GOLD[2]) * mix * 0.35;
      var alpha = 0.28 + 0.14 * Math.sin(t * 0.3 + phase);
      ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
      ctx.lineWidth = mobile ? 1 : i % 4 === 0 ? 1.35 : 1.05;
      ctx.stroke();
    }
  };

  HeroWave.prototype.tick = function (now) {
    if (!this.running) {
      return;
    }
    this.draw(now);
    this.raf = window.requestAnimationFrame(this.tick);
  };

  HeroWave.prototype.start = function () {
    if (this.running) {
      return;
    }
    this.running = true;
    this.raf = window.requestAnimationFrame(this.tick);
  };

  HeroWave.prototype.stop = function () {
    this.running = false;
    if (this.raf) {
      window.cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  };

  HeroWave.prototype.onVisibility = function () {
    if (document.hidden) {
      this.stop();
      return;
    }
    this.start();
  };

  HeroWave.prototype.mount = function () {
    this.resize();
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVis);
    this.start();
  };

  HeroWave.prototype.unmount = function () {
    this.stop();
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVis);
  };

  function boot() {
    var canvas = document.querySelector("[data-hero-wave]");
    if (!canvas || !canvas.getContext) {
      return;
    }
    if (reducedMotion()) {
      canvas.hidden = true;
      return;
    }
    var wave = new HeroWave(canvas);
    wave.mount();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

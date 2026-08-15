(function (root) {
  var VERT =
    "attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }";
  var FRAG = [
    "precision mediump float;",
    "uniform vec2 u_res;",
    "uniform vec2 u_mouse;",
    "uniform vec2 u_ripple_pos;",
    "uniform float u_time;",
    "uniform float u_scroll;",
    "uniform float u_ripple;",
    "uniform float u_quality;",
    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / u_res;",
    "  float aspect = u_res.x / max(u_res.y, 1.0);",
    "  vec2 p = vec2((uv.x - 0.40) * aspect, uv.y - 0.50);",
    "  vec2 m = vec2((u_mouse.x - 0.40) * aspect, u_mouse.y - 0.50);",
    "  float t = u_time;",
    "  float sc = u_scroll;",
    "  float zoom = mix(1.0, 0.58, sc);",
    "  p *= zoom;",
    "  m *= zoom;",
    "  vec2 w = vec2(",
    "    sin(p.y * 3.1 + t * 0.32) * 0.042,",
    "    cos(p.x * 2.7 - t * 0.26) * 0.038",
    "  );",
    "  p += w * (0.45 + sc * 0.55);",
    "  float d = length(p);",
    "  float md = length(p - m);",
    "  float bands = d * mix(8.2, 15.5, sc) - t * 0.48;",
    "  float ridge = abs(fract(bands) - 0.5);",
    "  float line = smoothstep(mix(0.09, 0.046, sc), 0.016, ridge);",
    "  float inner = exp(-d * 2.35);",
    "  float nested = abs(fract(d * 21.0 - t * 0.38) - 0.5);",
    "  line += smoothstep(0.11, 0.028, nested) * inner * 0.7;",
    "  float h = sin(d * 11.0 - t * 0.5) * 0.18;",
    "  h += sin(p.x * 4.2 + p.y * 3.1 + t * 0.2) * 0.08;",
    "  line *= 0.82 + h;",
    "  float glow = exp(-md * 2.6) * 0.38;",
    "  glow += inner * 0.16;",
    "  float fade = smoothstep(1.22, 0.1, d);",
    "  float rip = 0.0;",
    "  if (u_ripple > 0.001) {",
    "    vec2 rp = vec2((u_ripple_pos.x - 0.40) * aspect, u_ripple_pos.y - 0.50) * zoom;",
    "    float rd = abs(length(p - rp) - u_ripple * 1.55);",
    "    rip = smoothstep(0.09, 0.0, rd) * (1.0 - u_ripple);",
    "    rip += exp(-abs(length(p - rp) - u_ripple * 0.72) * 14.0) * (1.0 - u_ripple) * 0.45;",
    "  }",
    "  float edge = smoothstep(0.28, 1.05, d);",
    "  float ca = edge * mix(0.012, 0.006, u_quality);",
    "  vec2 pr = p + vec2(ca, ca * 0.35);",
    "  vec2 pb = p - vec2(ca, ca * 0.35);",
    "  float lineR = smoothstep(0.09, 0.016, abs(fract(length(pr) * mix(8.2, 15.5, sc) - t * 0.48) - 0.5));",
    "  float lineB = smoothstep(0.09, 0.016, abs(fract(length(pb) * mix(8.2, 15.5, sc) - t * 0.48) - 0.5));",
    "  vec3 anthracite = vec3(0.035, 0.045, 0.07);",
    "  vec3 gold = vec3(0.93, 0.67, 0.26);",
    "  vec3 amber = vec3(1.0, 0.78, 0.38);",
    "  vec3 prism = vec3(0.55, 0.78, 0.95);",
    "  float ink = (line + rip) * fade;",
    "  vec3 col = mix(anthracite, gold, ink);",
    "  col = mix(col, amber, glow * fade);",
    "  col.r += lineR * edge * fade * 0.55;",
    "  col.g += ink * edge * 0.08;",
    "  col.b += lineB * edge * fade * 0.62 + prism.b * glow * 0.12;",
    "  float a = (0.18 + ink * 0.62 + glow * 0.4 + rip * 0.55) * fade;",
    "  gl_FragColor = vec4(col, a);",
    "}",
  ].join("\n");

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isMobile() {
    return window.matchMedia("(max-width: 900px), (hover: none), (pointer: coarse)").matches;
  }

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function TopologyHeroScene(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    this.mobile = isMobile();
    this.mouse = { x: 0.4, y: 0.5, tx: 0.4, ty: 0.5 };
    this.tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    this.scroll = { v: 0, t: 0, scale: 1, y: 0 };
    this.ripple = { v: 0, x: 0.4, y: 0.5, active: false, born: 0 };
    this.running = false;
    this.raf = 0;
    this.startTime = 0;
    this.lastDraw = 0;
    this.minFrame = this.mobile ? 33 : 0;
    this.root = canvas.closest(".fintech-hero") || canvas.parentElement;
    this.bg = this.root ? this.root.querySelector("[data-hero-bg]") || this.root : this.root;
    this.onMove = this.onMove.bind(this);
    this.onLeave = this.onLeave.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.onResize = this.resize.bind(this);
    this.onVis = this.onVis.bind(this);
    this.tick = this.tick.bind(this);
    this.onPulseClick = this.onPulseClick.bind(this);
  }

  TopologyHeroScene.prototype.dprCap = function () {
    if (this.mobile) {
      return 1.15;
    }
    return 1.5;
  };

  TopologyHeroScene.prototype.setup = function () {
    var gl = this.gl;
    if (!gl) {
      return false;
    }
    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      return false;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      return false;
    }
    this.prog = prog;
    this.uRes = gl.getUniformLocation(prog, "u_res");
    this.uMouse = gl.getUniformLocation(prog, "u_mouse");
    this.uRipplePos = gl.getUniformLocation(prog, "u_ripple_pos");
    this.uTime = gl.getUniformLocation(prog, "u_time");
    this.uScroll = gl.getUniformLocation(prog, "u_scroll");
    this.uRipple = gl.getUniformLocation(prog, "u_ripple");
    this.uQuality = gl.getUniformLocation(prog, "u_quality");
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return true;
  };

  TopologyHeroScene.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), this.dprCap());
    var w = Math.max(1, Math.floor(rect.width * dpr));
    var h = Math.max(1, Math.floor(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    if (this.gl) {
      this.gl.viewport(0, 0, w, h);
    }
  };

  TopologyHeroScene.prototype.onMove = function (event) {
    if (!this.root) {
      return;
    }
    var rect = this.root.getBoundingClientRect();
    var x = (event.clientX - rect.left) / Math.max(rect.width, 1);
    var y = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1);
    this.mouse.tx = x;
    this.mouse.ty = y;
    this.tilt.tx = (x - 0.5) * 7.5;
    this.tilt.ty = (0.5 - y) * 5.2;
  };

  TopologyHeroScene.prototype.onLeave = function () {
    this.mouse.tx = 0.4;
    this.mouse.ty = 0.5;
    this.tilt.tx = 0;
    this.tilt.ty = 0;
  };

  TopologyHeroScene.prototype.onScroll = function () {
    var y = window.scrollY || 0;
    var h = this.root ? Math.max(this.root.offsetHeight, 1) : 1;
    this.scroll.t = Math.min(Math.max(y / h, 0), 1);
  };

  TopologyHeroScene.prototype.onVis = function () {
    if (document.hidden) {
      this.stop();
      return;
    }
    this.start();
  };

  TopologyHeroScene.prototype.pulse = function (origin) {
    this.ripple.active = true;
    this.ripple.born = performance.now();
    this.ripple.v = 0.001;
    if (origin && typeof origin.x === "number") {
      this.ripple.x = origin.x;
      this.ripple.y = origin.y;
    } else {
      this.ripple.x = this.mouse.x;
      this.ripple.y = this.mouse.y;
    }
  };

  TopologyHeroScene.prototype.onPulseClick = function (event) {
    if (!this.root) {
      this.pulse();
      return;
    }
    var rect = this.root.getBoundingClientRect();
    var x = (event.clientX - rect.left) / Math.max(rect.width, 1);
    var y = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1);
    if (x < -0.05 || x > 1.05 || y < -0.05 || y > 1.05) {
      this.pulse({ x: 0.4, y: 0.42 });
      return;
    }
    this.pulse({ x: x, y: y });
  };

  TopologyHeroScene.prototype.bindTriggers = function () {
    var self = this;
    var nodes = document.querySelectorAll(
      'a.btn-primary[href="#translator"], #ask-button, #upload-button'
    );
    nodes.forEach(function (node) {
      node.addEventListener("click", self.onPulseClick);
    });
  };

  TopologyHeroScene.prototype.draw = function (now) {
    var gl = this.gl;
    this.mouse.x += (this.mouse.tx - this.mouse.x) * 0.075;
    this.mouse.y += (this.mouse.ty - this.mouse.y) * 0.075;
    this.tilt.x += (this.tilt.tx - this.tilt.x) * 0.06;
    this.tilt.y += (this.tilt.ty - this.tilt.y) * 0.06;
    this.scroll.v += (this.scroll.t - this.scroll.v) * 0.08;
    var scale = 1 + this.scroll.v * 0.42;
    var lift = this.scroll.v * 10;
    this.scroll.scale = scale;
    if (this.ripple.active) {
      this.ripple.v = Math.min((now - this.ripple.born) / 920, 1);
      if (this.ripple.v >= 1) {
        this.ripple.active = false;
        this.ripple.v = 0;
      }
    }
    if (this.bg) {
      this.bg.style.setProperty("--topo-rx", (this.tilt.y + this.scroll.v * 8).toFixed(2) + "deg");
      this.bg.style.setProperty("--topo-ry", this.tilt.x.toFixed(2) + "deg");
    }
    this.canvas.style.setProperty("--topo-scale", scale.toFixed(3));
    this.canvas.style.setProperty("--topo-y", lift.toFixed(2) + "%");
    if (this.root) {
      this.root.style.setProperty("--topo-floor", this.scroll.v.toFixed(3));
    }
    document.documentElement.style.setProperty("--topo-floor", this.scroll.v.toFixed(3));
    gl.useProgram(this.prog);
    gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.uMouse, this.mouse.x, this.mouse.y);
    gl.uniform2f(this.uRipplePos, this.ripple.x, this.ripple.y);
    gl.uniform1f(this.uTime, (now - this.startTime) * 0.001);
    gl.uniform1f(this.uScroll, this.scroll.v);
    gl.uniform1f(this.uRipple, this.ripple.v);
    gl.uniform1f(this.uQuality, this.mobile ? 0 : 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  TopologyHeroScene.prototype.tick = function (now) {
    if (!this.running) {
      return;
    }
    if (this.minFrame && now - this.lastDraw < this.minFrame) {
      this.raf = window.requestAnimationFrame(this.tick);
      return;
    }
    this.lastDraw = now;
    this.draw(now);
    this.raf = window.requestAnimationFrame(this.tick);
  };

  TopologyHeroScene.prototype.start = function () {
    if (this.running) {
      return;
    }
    this.running = true;
    this.startTime = this.startTime || performance.now();
    this.raf = window.requestAnimationFrame(this.tick);
  };

  TopologyHeroScene.prototype.stop = function () {
    this.running = false;
    if (this.raf) {
      window.cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  };

  TopologyHeroScene.prototype.mount = function () {
    if (!this.setup()) {
      return this;
    }
    this.resize();
    this.onScroll();
    window.addEventListener("resize", this.onResize, { passive: true });
    window.addEventListener("scroll", this.onScroll, { passive: true });
    document.addEventListener("visibilitychange", this.onVis);
    if (this.root && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      window.addEventListener("pointermove", this.onMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", this.onLeave);
    }
    this.bindTriggers();
    this.start();
    return this;
  };

  TopologyHeroScene.mount = function (canvas) {
    if (!canvas || reducedMotion()) {
      if (canvas) {
        canvas.hidden = true;
      }
      return null;
    }
    return new TopologyHeroScene(canvas).mount();
  };

  function boot() {
    var canvas = document.querySelector("[data-topo]");
    root.TopologyHeroScene = TopologyHeroScene;
    root.__topoHero = TopologyHeroScene.mount(canvas);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);

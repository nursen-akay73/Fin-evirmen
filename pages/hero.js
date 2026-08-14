(function () {
  const EASE = 0.075;
  const LIGHT_EASE = 0.08;
  const CURRENCIES = [
    {
      code: "TRY",
      symbol: "₺",
      name: "Türk Lirası",
      radius: 0.54,
      duration: 46,
      reverse: false,
      start: 12,
      floatX: "4px",
      floatY: "-6px",
      floatDuration: "5s",
      glowDuration: "4.8s",
      glowDelay: "-1.2s",
    },
    {
      code: "USD",
      symbol: "$",
      name: "ABD Doları",
      radius: 0.68,
      duration: 58,
      reverse: true,
      start: 102,
      floatX: "7px",
      floatY: "4px",
      floatDuration: "6.5s",
      glowDuration: "6.1s",
      glowDelay: "-2.4s",
    },
    {
      code: "EUR",
      symbol: "€",
      name: "Euro",
      radius: 0.8,
      duration: 72,
      reverse: false,
      start: 198,
      floatX: "0px",
      floatY: "-8px",
      floatDuration: "7.5s",
      glowDuration: "5.5s",
      glowDelay: "-0.6s",
    },
    {
      code: "GBP",
      symbol: "£",
      name: "Sterlin",
      radius: 0.92,
      duration: 86,
      reverse: true,
      start: 288,
      floatX: "-3px",
      floatY: "7px",
      floatDuration: "9s",
      glowDuration: "6.6s",
      glowDelay: "-3.1s",
    },
  ];

  const PARTICLE_KINDS = ["dot", "dot", "plus", "dash", "dot"];
  const DATA_GLYPHS = ["FX", "%", "+", "01", "24", "·"];

  function lerp(current, target, amount) {
    return current + (target - current) * amount;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  class FintechBackground {
    constructor(root, options) {
      this.root = root;
      this.layer = root.querySelector("[data-layer='particles']");
      this.dataLayer = root.querySelector("[data-layer='data']");
      this.count = options.particleCount;
      this.glyphCount = options.glyphCount;
      this.render();
    }

    render() {
      if (this.layer) {
        this.layer.replaceChildren();
        const fragment = document.createDocumentFragment();
        for (let index = 0; index < this.count; index += 1) {
          const particle = document.createElement("span");
          const kind = PARTICLE_KINDS[index % PARTICLE_KINDS.length];
          particle.className = `hero-particle is-${kind}`;
          if (kind === "plus") {
            particle.textContent = "+";
          }
          const size = index % 4 === 0 ? 5 : index % 3 === 0 ? 2 : 3;
          particle.style.left = `${6 + Math.random() * 88}%`;
          particle.style.top = `${8 + Math.random() * 84}%`;
          particle.style.setProperty("--size", `${size}px`);
          particle.style.setProperty("--glow", `${0.18 + Math.random() * 0.28}`);
          particle.style.setProperty("--halo", `${index % 5 === 0 ? 8 : 0}px`);
          particle.style.setProperty("--dur", `${14 + Math.random() * 16}s`);
          particle.style.setProperty("--delay", `${index * -1.7}s`);
          particle.style.setProperty("--dx", `${(Math.random() * 22 - 8).toFixed(1)}px`);
          particle.style.setProperty("--dy", `${(Math.random() * -40 - 8).toFixed(1)}px`);
          fragment.appendChild(particle);
        }
        this.layer.appendChild(fragment);
      }
      if (this.dataLayer) {
        this.dataLayer.replaceChildren();
        const fragment = document.createDocumentFragment();
        for (let index = 0; index < this.glyphCount; index += 1) {
          const glyph = document.createElement("span");
          glyph.className = "hero-glyph";
          glyph.textContent = DATA_GLYPHS[index % DATA_GLYPHS.length];
          glyph.style.left = `${8 + Math.random() * 50}%`;
          glyph.style.top = `${12 + Math.random() * 76}%`;
          glyph.style.setProperty("--dur", `${18 + Math.random() * 14}s`);
          glyph.style.setProperty("--delay", `${index * -2.2}s`);
          glyph.style.setProperty("--dx", `${(Math.random() * 16 - 6).toFixed(1)}px`);
          glyph.style.setProperty("--dy", `${(Math.random() * -24 - 4).toFixed(1)}px`);
          fragment.appendChild(glyph);
        }
        this.dataLayer.appendChild(fragment);
      }
    }

    setParallax(x, y) {
      this.root.style.setProperty("--atm-x", `${x * 4}px`);
      this.root.style.setProperty("--atm-y", `${y * 4}px`);
      this.root.style.setProperty("--grid-x", `${x * 6}px`);
      this.root.style.setProperty("--grid-y", `${y * 6}px`);
      this.root.style.setProperty("--part-x", `${x * 14}px`);
      this.root.style.setProperty("--part-y", `${y * 12}px`);
      this.root.style.setProperty("--data-x", `${x * 8}px`);
      this.root.style.setProperty("--data-y", `${y * 6}px`);
    }
  }


  class HeroDriftField {
    constructor(root, options) {
      this.root = root;
      this.reducedMotion = options.reducedMotion;
      this.mobile = options.mobile;
      this.mouseEnabled = options.mouseEnabled;
      this.items = [];
      this.layer = null;
      this.build();
    }

    shapes() {
      const count = this.reducedMotion ? 0 : this.mobile ? 4 : 9;
      const catalog = [
        { kind: "glyph", text: "₺", x: 8, y: 14, depth: 0.35, dur: 11 },
        { kind: "receipt", x: 86, y: 18, depth: 0.7, dur: 14 },
        { kind: "glyph", text: "$", x: 92, y: 62, depth: 0.45, dur: 13 },
        { kind: "invoice", x: 6, y: 68, depth: 0.85, dur: 16 },
        { kind: "glyph", text: "€", x: 78, y: 82, depth: 0.4, dur: 12 },
        { kind: "receipt", x: 18, y: 88, depth: 0.6, dur: 15 },
        { kind: "invoice", x: 94, y: 38, depth: 0.95, dur: 17 },
        { kind: "glyph", text: "%", x: 4, y: 42, depth: 0.5, dur: 10 },
        { kind: "receipt", x: 72, y: 8, depth: 0.3, dur: 18 },
      ];
      return catalog.slice(0, count);
    }

    build() {
      if (this.layer) {
        this.layer.remove();
      }
      this.layer = document.createElement("div");
      this.layer.className = "hero-drift";
      this.layer.setAttribute("data-layer", "drift");
      this.layer.setAttribute("aria-hidden", "true");
      this.root.appendChild(this.layer);
      this.items = this.shapes().map((shape, index) => {
        const el = document.createElement("span");
        el.className = `hero-drift-item is-${shape.kind}`;
        el.style.left = `${shape.x}%`;
        el.style.top = `${shape.y}%`;
        el.style.setProperty("--dur", `${shape.dur}s`);
        el.style.setProperty("--delay", `${index * -1.4}s`);
        const inner = document.createElement("span");
        inner.className = "hero-drift-inner";
        if (shape.kind === "glyph") {
          inner.textContent = shape.text;
        }
        el.appendChild(inner);
        this.layer.appendChild(el);
        return {
          el,
          x: shape.x,
          y: shape.y,
          depth: shape.depth,
          mx: 0,
          my: 0,
        };
      });
    }

    update(pointer, bounds, scrollY, mouseOn) {
      if (!this.items.length) {
        return;
      }
      const width = bounds.width || 1;
      const height = bounds.height || 1;
      const radius = Math.min(200, width * 0.22);
      this.items.forEach((item) => {
        const px = (item.x / 100) * width;
        const py = (item.y / 100) * height;
        let targetX = 0;
        let targetY = 0;
        if (mouseOn && pointer.active) {
          const dx = px - pointer.x;
          const dy = py - pointer.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < radius) {
            const force = Math.pow(1 - dist / radius, 2) * 22 * item.depth;
            targetX = (dx / dist) * force;
            targetY = (dy / dist) * force;
          }
        }
        item.mx += (targetX - item.mx) * 0.06;
        item.my += (targetY - item.my) * 0.06;
        const sy = scrollY * item.depth * 0.12;
        const sx = scrollY * item.depth * -0.03;
        item.el.style.transform =
          "translate3d(" +
          (item.mx + sx).toFixed(2) +
          "px," +
          (item.my + sy).toFixed(2) +
          "px,0)";
      });
    }
  }

  class CurrencyNode {
    constructor(currency, stageSize, reducedMotion) {
      this.currency = currency;
      this.arm = document.createElement("div");
      this.arm.className = "orbit-arm";
      this.arm.style.setProperty("--radius", `${currency.radius * stageSize}px`);
      this.arm.style.setProperty("--duration", `${currency.duration}s`);
      this.arm.style.setProperty("--direction", currency.reverse ? "reverse" : "normal");

      this.holder = document.createElement("div");
      this.holder.className = "node-spin";

      this.float = document.createElement("div");
      this.float.className = "node-float";
      this.float.style.setProperty("--float-x", currency.floatX);
      this.float.style.setProperty("--float-y", currency.floatY);
      this.float.style.setProperty("--float-duration", currency.floatDuration);
      this.float.style.setProperty("--float-delay", `${currency.start / -48}s`);

      this.button = document.createElement("button");
      this.button.type = "button";
      this.button.className = "currency-node";
      this.button.dataset.code = currency.code;
      this.button.setAttribute("aria-label", `${currency.code}, ${currency.name}`);
      this.button.innerHTML = `${currency.symbol}<span class="label">${currency.code} · ${currency.name}</span>`;
      this.button.style.setProperty("--glow-duration", currency.glowDuration);
      this.button.style.setProperty("--glow-delay", currency.glowDelay);

      this.float.appendChild(this.button);
      this.holder.appendChild(this.float);
      this.arm.appendChild(this.holder);

      const delay = -((currency.start / 360) * currency.duration);
      if (reducedMotion) {
        this.arm.style.animation = "none";
        this.holder.style.animation = "none";
        this.float.style.animation = "none";
        this.arm.style.transform = `rotate(${currency.start}deg)`;
        this.holder.style.transform = `rotate(${-currency.start}deg)`;
      } else {
        this.arm.style.animationDelay = `${delay}s`;
        this.holder.style.animationDelay = `${delay}s`;
      }
    }
  }

  class ConnectionLines {
    constructor(stage, onArrive) {
      this.stage = stage;
      this.onArrive = onArrive;
      this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.svg.classList.add("connections");
      this.svg.setAttribute("aria-hidden", "true");
      this.lines = [];
      this.pulses = [];
      this.stage.prepend(this.svg);
    }

    bind(nodes) {
      this.svg.replaceChildren();
      this.lines = nodes.map((node) => {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.dataset.code = node.button.dataset.code;
        this.svg.appendChild(line);
        return { line, node: node.button };
      });
      this.pulses = this.lines.slice(0, 2).map((item, index) => {
        const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        pulse.setAttribute("r", "2.2");
        pulse.classList.add("pulse");
        this.svg.appendChild(pulse);
        return {
          pulse,
          node: item.node,
          line: item.line,
          duration: 7800 + index * 1600,
          phase: index * 0.48,
          arrived: false,
        };
      });
    }

    setActive(code) {
      this.lines.forEach(({ line }) => {
        line.classList.toggle("is-hot", Boolean(code) && line.dataset.code === code);
      });
    }

    draw(time, reducedMotion) {
      const bounds = this.stage.getBoundingClientRect();
      const cx = bounds.width / 2;
      const cy = bounds.height / 2;
      this.lines.forEach(({ line, node }) => {
        const rect = node.getBoundingClientRect();
        const x = rect.left + rect.width / 2 - bounds.left;
        const y = rect.top + rect.height / 2 - bounds.top;
        line.setAttribute("x1", String(cx));
        line.setAttribute("y1", String(cy));
        line.setAttribute("x2", String(x));
        line.setAttribute("y2", String(y));
      });

      if (reducedMotion) {
        this.pulses.forEach(({ pulse }) => pulse.setAttribute("opacity", "0"));
        return;
      }

      this.pulses.forEach((item) => {
        const rect = item.node.getBoundingClientRect();
        const x2 = rect.left + rect.width / 2 - bounds.left;
        const y2 = rect.top + rect.height / 2 - bounds.top;
        const cycle = ((time / item.duration) + item.phase) % 1;
        const activeWindow = 0.26;
        const traveling = cycle < activeWindow;
        if (!traveling) {
          item.pulse.setAttribute("opacity", "0");
          item.line.classList.remove("is-flowing");
          item.arrived = false;
          return;
        }
        const t = cycle / activeWindow;
        item.pulse.setAttribute("opacity", String(0.25 + t * 0.7));
        item.pulse.setAttribute("cx", String(x2 + (cx - x2) * t));
        item.pulse.setAttribute("cy", String(y2 + (cy - y2) * t));
        item.line.classList.add("is-flowing");
        if (t > 0.9 && !item.arrived) {
          item.arrived = true;
          this.onArrive();
        }
      });
    }
  }

  class CurrencyOrbit {
    constructor(stage, options) {
      this.stage = stage;
      this.reducedMotion = options.reducedMotion;
      this.nodes = [];
      this.lines = new ConnectionLines(stage, options.onPulseArrive);
      this.build();
    }

    build() {
      this.nodes.forEach((node) => node.arm.remove());
      const size = this.stage.clientWidth;
      this.nodes = CURRENCIES.map((currency) => {
        const node = new CurrencyNode(currency, size, this.reducedMotion);
        this.stage.appendChild(node.arm);
        node.button.addEventListener("mouseenter", () => this.activate(node));
        node.button.addEventListener("focus", () => this.activate(node));
        node.button.addEventListener("mouseleave", () => this.clear());
        node.button.addEventListener("blur", () => this.clear());
        return node;
      });
      this.lines.bind(this.nodes);
    }

    activate(node) {
      this.stage.classList.add("is-hot");
      this.nodes.forEach((item) => {
        item.button.classList.toggle("is-active", item === node);
      });
      this.lines.setActive(node.button.dataset.code);
    }

    clear() {
      this.stage.classList.remove("is-hot");
      this.nodes.forEach((item) => item.button.classList.remove("is-active"));
      this.lines.setActive(null);
    }

    setNodeParallax(x, y) {
      this.nodes.forEach((node) => {
        const depth = 0.35 + node.currency.radius * 0.7;
        node.button.style.setProperty("--nx", `${x * 10 * depth}px`);
        node.button.style.setProperty("--ny", `${y * 8 * depth}px`);
      });
    }
  }

  class MagneticButtons {
    constructor(root, enabled) {
      this.enabled = enabled;
      this.buttons = [...root.querySelectorAll("[data-magnetic]")];
      if (!this.enabled) {
        return;
      }
      this.buttons.forEach((button) => this.bind(button));
    }

    bind(button) {
      const label = button.querySelector(".btn-label");
      const reset = () => {
        button.style.setProperty("--mx", "0px");
        button.style.setProperty("--my", "0px");
        if (label) {
          label.style.setProperty("--tx", "0px");
          label.style.setProperty("--ty", "0px");
        }
      };
      button.addEventListener("pointermove", (event) => {
        const rect = button.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        button.style.setProperty("--mx", `${clamp(dx * 0.18, -6, 6)}px`);
        button.style.setProperty("--my", `${clamp(dy * 0.18, -6, 6)}px`);
        if (label) {
          label.style.setProperty("--tx", `${clamp(dx * 0.06, -2, 2)}px`);
          label.style.setProperty("--ty", `${clamp(dy * 0.06, -2, 2)}px`);
        }
      });
      button.addEventListener("pointerleave", reset);
      button.addEventListener("blur", reset);
    }
  }

  class FintechHero {
    constructor(root) {
      this.root = root;
      this.stage = root.querySelector("[data-orbit-stage]");
      this.bgEl = root.querySelector("[data-hero-bg]");
      this.copy = root.querySelector("[data-hero-copy]");
      this.logo = root.querySelector("[data-logo-core]");
      this.light = root.querySelector("[data-cursor-light]");
      this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.mobile = window.matchMedia("(max-width: 900px)").matches;
      this.finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      this.pointer = { x: 0, y: 0 };
      this.pointerPx = { x: 0, y: 0, active: false };
      this.smooth = { x: 0, y: 0 };
      this.lightPos = { x: 0, y: 0, o: 0 };
      this.lightTarget = { x: 0, y: 0, o: 0 };
      this.logoLock = false;
      this.scrollY = 0;
      this.background = new FintechBackground(this.bgEl, {
        particleCount: this.particleCount(),
        glyphCount: this.glyphCount(),
      });
      this.drift = new HeroDriftField(this.bgEl, {
        reducedMotion: this.reducedMotion,
        mobile: this.mobile,
        mouseEnabled: this.finePointer && !this.mobile && !this.reducedMotion,
      });
      this.orbit = new CurrencyOrbit(this.stage, {
        reducedMotion: this.reducedMotion,
        onPulseArrive: () => this.receivePulse(),
      });
      this.magnetic = new MagneticButtons(
        root,
        this.finePointer && !this.mobile && !this.reducedMotion
      );
      this.bind();
      this.onScroll();
      this.loop = this.loop.bind(this);
      this.enter();
      if (!this.reducedMotion) {
        requestAnimationFrame(this.loop);
      } else {
        this.orbit.lines.draw(0, true);
      }
    }

    particleCount() {
      if (this.reducedMotion) {
        return 0;
      }
      if (this.mobile) {
        return 5;
      }
      return 10;
    }

    glyphCount() {
      if (this.reducedMotion) {
        return 0;
      }
      if (this.mobile) {
        return 2;
      }
      return 6;
    }

    parallaxScale() {
      if (!this.finePointer || this.reducedMotion) {
        return 0;
      }
      return this.mobile ? 0.35 : 1;
    }

    enter() {
      const reveal = () => this.root.classList.add("is-ready");
      if (this.reducedMotion) {
        reveal();
        return;
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(reveal);
      });
    }

    receivePulse() {
      if (!this.logo || this.reducedMotion || this.logoLock) {
        return;
      }
      this.logoLock = true;
      this.logo.classList.add("is-receiving");
      window.setTimeout(() => {
        this.logo.classList.remove("is-receiving");
        this.logoLock = false;
      }, 220);
    }

    bind() {
      if (!this.reducedMotion && this.finePointer) {
        this.root.addEventListener("pointermove", (event) => {
          const rect = this.root.getBoundingClientRect();
          this.pointer.x = (event.clientX - rect.left) / rect.width - 0.5;
          this.pointer.y = (event.clientY - rect.top) / rect.height - 0.5;
          this.pointerPx.x = event.clientX - rect.left;
          this.pointerPx.y = event.clientY - rect.top;
          this.pointerPx.active = true;
          this.lightTarget.x = event.clientX - rect.left;
          this.lightTarget.y = event.clientY - rect.top;
          this.lightTarget.o = 1;
        });
        this.root.addEventListener("pointerleave", () => {
          this.pointer.x = 0;
          this.pointer.y = 0;
          this.pointerPx.active = false;
          this.lightTarget.o = 0;
        });
      }
      window.addEventListener("fintech-gl-pulse", () => this.receivePulse());
      window.addEventListener("scroll", () => this.onScroll(), { passive: true });
      window.addEventListener("resize", () => {
        window.clearTimeout(this.resizeTimer);
        this.resizeTimer = window.setTimeout(() => {
          this.mobile = window.matchMedia("(max-width: 900px)").matches;
          this.finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
          this.orbit.build();
        }, 140);
      });
    }

    onScroll() {
      const max = Math.max(this.root.offsetHeight * 0.7, 1);
      const progress = Math.min(1, window.scrollY / max);
      this.scrollY = window.scrollY;
      this.root.style.setProperty("--orbit-expand", String(1 + progress * 0.28));
      this.root.style.setProperty("--logo-scale", String(1 - progress * 0.12));
      this.root.style.setProperty("--line-opacity", String(0.55 - progress * 0.35));
      this.root.style.setProperty("--copy-shift", `${progress * -36}px`);
      this.root.style.setProperty("--copy-fade", String(1 - progress * 0.42));
    }

    loop(time) {
      const scale = this.parallaxScale();
      this.smooth.x = lerp(this.smooth.x, this.pointer.x * scale, EASE);
      this.smooth.y = lerp(this.smooth.y, this.pointer.y * scale, EASE);
      const x = this.smooth.x;
      const y = this.smooth.y;

      this.stage.style.setProperty("--parx", `${x * 12}px`);
      this.stage.style.setProperty("--pary", `${y * 10}px`);
      if (this.logo) {
        this.logo.style.setProperty("--logox", `${x * -4}px`);
        this.logo.style.setProperty("--logoy", `${y * -3}px`);
      }
      if (this.copy) {
        this.copy.style.setProperty("--copy-x", `${x * 4}px`);
        this.copy.style.setProperty("--copy-y", `${y * 3}px`);
      }
      this.background.setParallax(x, y);
      this.orbit.setNodeParallax(x, y);
      this.orbit.lines.draw(time, this.reducedMotion);
      if (this.drift) {
        const mouseOn =
          this.finePointer && !this.mobile && !this.reducedMotion;
        this.drift.update(
          this.pointerPx,
          { width: this.root.clientWidth, height: this.root.clientHeight },
          this.scrollY,
          mouseOn
        );
      }

      if (this.light && this.finePointer && !this.mobile) {
        this.lightPos.x = lerp(this.lightPos.x, this.lightTarget.x, LIGHT_EASE);
        this.lightPos.y = lerp(this.lightPos.y, this.lightTarget.y, LIGHT_EASE);
        this.lightPos.o = lerp(this.lightPos.o, this.lightTarget.o, 0.06);
        this.light.style.opacity = this.lightPos.o.toFixed(3);
        this.light.style.transform = `translate3d(${this.lightPos.x - 360}px, ${this.lightPos.y - 360}px, 0)`;
      }

      requestAnimationFrame(this.loop);
    }
  }

  const hero = document.getElementById("hero");
  if (hero) {
    new FintechHero(hero);
  }
})();

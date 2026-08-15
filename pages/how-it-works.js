(function () {
  var VECTOR = "[0.23, -0.81, 0.05, …]";
  var GLYPHS = "0123456789.-[], ";
  var NS = "http://www.w3.org/2000/svg";
  var CHUNK_COUNT = 11;
  var MATCH_INDEX = [2, 7];

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function splitTitle(h1) {
    if (h1.querySelector(".word")) {
      return h1.querySelectorAll(".word");
    }
    var text = h1.textContent.trim();
    var parts = text.split(/\s+/);
    h1.textContent = "";
    parts.forEach(function (word, index) {
      var wrap = document.createElement("span");
      wrap.className = "word-wrap";
      var inner = document.createElement("span");
      inner.className = "word";
      inner.textContent = word;
      wrap.appendChild(inner);
      h1.appendChild(wrap);
      if (index < parts.length - 1) {
        h1.appendChild(document.createTextNode(" "));
      }
    });
    return h1.querySelectorAll(".word");
  }

  function playIntro(root) {
    var eyebrow = root.querySelector(".story-eyebrow");
    var title = root.querySelector("[data-how-title]");
    var lede = root.querySelector("[data-how-lede]");
    if (reducedMotion() || !window.gsap) {
      return;
    }
    var words = title ? splitTitle(title) : [];
    window.gsap.set(eyebrow, { x: -24, opacity: 0 });
    window.gsap.set(words, { yPercent: 110, opacity: 0 });
    window.gsap.set(lede, { opacity: 0, y: 10 });
    window.gsap
      .timeline()
      .to(eyebrow, { x: 0, opacity: 1, duration: 0.3, ease: "power2.out" })
      .to(words, { yPercent: 0, opacity: 1, duration: 0.45, stagger: 0.1, ease: "power3.out" }, 0.08)
      .to(lede, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "+=0.2");
  }

  function scrambleTo(el, target, duration) {
    var state = { t: 0 };
    return window.gsap.to(state, {
      t: 1,
      duration: duration,
      ease: "none",
      onUpdate: function () {
        var lock = Math.floor(state.t * target.length);
        var out = "";
        var i;
        for (i = 0; i < target.length; i += 1) {
          if (i < lock || target[i] === " ") {
            out += target[i];
          } else {
            out += GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
          }
        }
        el.textContent = out;
      },
      onComplete: function () {
        el.textContent = target;
      },
    });
  }

  function typewriter(el, target, duration) {
    var state = { n: 0 };
    el.textContent = "";
    return window.gsap.to(state, {
      n: target.length,
      duration: duration,
      ease: "none",
      onUpdate: function () {
        el.textContent = target.slice(0, Math.round(state.n));
      },
      onComplete: function () {
        el.textContent = target;
      },
    });
  }

  function pointOnPath(path, length, progress) {
    if (!path.getPointAtLength) {
      return { x: 0, y: 0 };
    }
    return path.getPointAtLength(length * Math.max(0, Math.min(1, progress)));
  }

  function setCircle(el, pt, opacity) {
    if (!el || !pt) {
      return;
    }
    el.setAttribute("cx", pt.x);
    el.setAttribute("cy", pt.y);
    if (typeof opacity === "number") {
      el.setAttribute("opacity", String(opacity));
    }
  }

  function layout(pipe, path, packet) {
    var nodes = pipe.querySelectorAll("[data-node]");
    var svg = pipe.querySelector(".how-pipe-svg");
    var chunksHost = pipe.querySelector("[data-how-chunks]");
    var idleHost = pipe.querySelector("[data-how-idle]");
    var width = Math.max(1, pipe.offsetWidth);
    var height = Math.max(1, pipe.offsetHeight);
    var box = pipe.getBoundingClientRect();
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    var points = [];
    nodes.forEach(function (node) {
      var rect = node.getBoundingClientRect();
      points.push({
        x: rect.left - box.left + rect.width / 2,
        y: rect.top - box.top + rect.height / 2,
      });
    });
    path.setAttribute("d", "M " + points.map(function (pt) {
      return pt.x + " " + pt.y;
    }).join(" L "));
    var length = path.getTotalLength ? path.getTotalLength() : 0;
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);
    setCircle(packet, points[0], 0);

    chunksHost.textContent = "";
    idleHost.textContent = "";
    var neon = points[2] || points[0];
    var chunks = [];
    var i;
    for (i = 0; i < CHUNK_COUNT; i += 1) {
      var angle = (Math.PI * 2 * i) / CHUNK_COUNT + 0.35;
      var radius = 28 + (i % 3) * 11;
      var chunk = document.createElementNS(NS, "circle");
      var cx = neon.x + Math.cos(angle) * radius;
      var cy = neon.y + Math.sin(angle) * radius;
      chunk.setAttribute("cx", cx);
      chunk.setAttribute("cy", cy);
      chunk.setAttribute("r", MATCH_INDEX.indexOf(i) >= 0 ? "3.2" : "2.2");
      chunk.setAttribute("class", "how-chunk");
      chunksHost.appendChild(chunk);
      chunks.push({ el: chunk, x: cx, y: cy, match: MATCH_INDEX.indexOf(i) >= 0 });
    }

    var idle = [];
    for (i = 0; i < 3; i += 1) {
      var dot = document.createElementNS(NS, "circle");
      dot.setAttribute("r", "2.4");
      dot.setAttribute("class", "how-idle-dot");
      idleHost.appendChild(dot);
      idle.push(dot);
    }

    return { length: length, points: points, chunks: chunks, idle: idle };
  }

  function liveStop(stops, index) {
    stops.forEach(function (stop, i) {
      stop.classList.toggle("is-live", i === index);
    });
  }

  function startIdle(path, length, dots) {
    if (!window.gsap || !length) {
      return;
    }
    dots.forEach(function (dot, index) {
      var offset = index / Math.max(1, dots.length);
      var state = { t: offset };
      setCircle(dot, pointOnPath(path, length, offset));
      window.gsap.to(state, {
        t: offset + 1,
        duration: 7.5,
        repeat: -1,
        ease: "none",
        onUpdate: function () {
          var wrapped = state.t % 1;
          if (wrapped < 0) {
            wrapped += 1;
          }
          setCircle(dot, pointOnPath(path, length, wrapped));
        },
      });
    });
  }

  var started = false;

  function start() {
    if (started) {
      return;
    }
    started = true;
    var root = document.querySelector("[data-how-showcase]");
    if (!root) {
      return;
    }
    var pipe = root.querySelector("[data-how-pipe]");
    var fallback = root.querySelector("[data-how-fallback]");
    var useFallback = reducedMotion() || !window.gsap;

    document.body.classList.add("how-ready");
    playIntro(root);

    if (useFallback) {
      document.body.classList.add("how-static");
      if (pipe) {
        pipe.hidden = true;
      }
      if (fallback) {
        fallback.removeAttribute("hidden");
      }
      return;
    }

    pipe.hidden = false;
    var path = pipe.querySelector("[data-how-path]");
    var packet = pipe.querySelector("[data-how-packet]");
    var matchA = pipe.querySelector("[data-how-match-a]");
    var matchB = pipe.querySelector("[data-how-match-b]");
    var question = pipe.querySelector("[data-how-question]");
    var vector = pipe.querySelector("[data-how-vector]");
    var answer = pipe.querySelector("[data-how-answer]");
    var source = pipe.querySelector("[data-how-source]");
    var stops = pipe.querySelectorAll(".how-stop");
    var geo = { length: 0, points: [], chunks: [], idle: [] };
    var played = false;

    function refresh() {
      geo = layout(pipe, path, packet);
    }

    refresh();
    window.addEventListener("resize", function () {
      refresh();
      if (played && path) {
        path.style.strokeDashoffset = "0";
      }
    });

    function playPipe() {
      if (played) {
        return;
      }
      played = true;
      pipe.classList.add("is-played");
      refresh();

      var travel = { t: 0 };
      var answerText = answer.getAttribute("data-answer") || "";
      if (!answerText) {
        answerText =
          (window.I18N && window.I18N.t("story.pipe.answer")) ||
          "Repo, bir kıymetin geri alınmak üzere satılmasıdır.";
      }

      var tl = window.gsap.timeline({
        onComplete: function () {
          pipe.classList.add("is-idle");
          startIdle(path, geo.length, geo.idle);
        },
      });

      liveStop(stops, 0);
      window.gsap.set(source, { opacity: 0 });
      tl.fromTo(
        path,
        { strokeDashoffset: geo.length },
        { strokeDashoffset: 0, duration: 0.45, ease: "power2.out" }
      );
      tl.add(function () {
        question.classList.add("how-mono");
      });
      tl.add(scrambleTo(question, VECTOR, 0.65));
      tl.to(question, { opacity: 0.4, duration: 0.18 }, "-=0.05");
      tl.add(function () {
        setCircle(packet, geo.points[0], 1);
        liveStop(stops, 1);
      });
      tl.to(travel, {
        t: 1 / 3,
        duration: 0.4,
        ease: "power1.inOut",
        onUpdate: function () {
          setCircle(packet, pointOnPath(path, geo.length, travel.t), 1);
        },
        onComplete: function () {
          vector.textContent = VECTOR;
        },
      });
      tl.add(function () {
        liveStop(stops, 2);
      });
      tl.to(travel, {
        t: 2 / 3,
        duration: 0.4,
        ease: "power1.inOut",
        onUpdate: function () {
          setCircle(packet, pointOnPath(path, geo.length, travel.t), 1);
        },
      });
      tl.add(function () {
        geo.chunks.forEach(function (chunk) {
          if (chunk.match) {
            chunk.el.classList.add("is-hit");
            window.gsap.fromTo(
              chunk.el,
              { attr: { r: 3.2 } },
              { attr: { r: 6.5 }, duration: 0.35, yoyo: true, repeat: 1, ease: "power2.out" }
            );
          } else {
            window.gsap.to(chunk.el, { opacity: 0.28, duration: 0.25 });
          }
        });
        var hits = geo.chunks.filter(function (chunk) {
          return chunk.match;
        });
        if (hits[0]) {
          setCircle(matchA, { x: hits[0].x, y: hits[0].y }, 1);
        }
        if (hits[1]) {
          setCircle(matchB, { x: hits[1].x, y: hits[1].y }, 1);
        }
      });
      tl.to({}, { duration: 0.2 });
      tl.add(function () {
        liveStop(stops, 3);
      });
      var groq = geo.points[3] || geo.points[0];
      tl.to(
        {},
        {
          duration: 0.4,
          ease: "power1.inOut",
          onUpdate: function () {
            var hits = geo.chunks.filter(function (chunk) {
              return chunk.match;
            });
            var p = this.progress();
            if (hits[0]) {
              setCircle(matchA, {
                x: hits[0].x + (groq.x - hits[0].x) * p,
                y: hits[0].y + (groq.y - hits[0].y) * p,
              });
            }
            if (hits[1]) {
              setCircle(matchB, {
                x: hits[1].x + (groq.x - hits[1].x) * p,
                y: hits[1].y + (groq.y - hits[1].y) * p,
              });
            }
            setCircle(packet, pointOnPath(path, geo.length, 2 / 3 + p / 3), 1);
          },
          onComplete: function () {
            setCircle(matchA, groq, 0);
            setCircle(matchB, groq, 0);
            setCircle(packet, groq, 0.35);
          },
        }
      );
      tl.add(typewriter(answer, answerText, 0.7));
      tl.to(source, { opacity: 1, duration: 0.3, ease: "power2.out" });
    }

    if (window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      window.ScrollTrigger.create({
        trigger: pipe,
        start: "top 72%",
        once: true,
        onEnter: playPipe,
      });
      window.setTimeout(function () {
        window.ScrollTrigger.refresh();
      }, 200);
    } else if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              playPipe();
              observer.disconnect();
            }
          });
        },
        { threshold: 0.4 }
      );
      observer.observe(pipe);
    } else {
      playPipe();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

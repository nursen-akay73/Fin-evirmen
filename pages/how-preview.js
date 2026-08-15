(function () {
  var STEP_MS = 3800;

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function start() {
    var root = document.querySelector("[data-how-preview]");
    if (!root) {
      return;
    }
    var cards = root.querySelectorAll("[data-how-step]");
    if (!cards.length) {
      return;
    }
    var step = 0;
    var timer = 0;

    function setStep(next) {
      step = ((next % cards.length) + cards.length) % cards.length;
      cards.forEach(function (card, index) {
        card.classList.toggle("is-on", index === step);
      });
    }

    if (reducedMotion()) {
      cards.forEach(function (card) {
        card.classList.add("is-on");
      });
      return;
    }

    setStep(0);
    timer = window.setInterval(function () {
      setStep(step + 1);
    }, STEP_MS);

    cards.forEach(function (card, index) {
      card.addEventListener("mouseenter", function () {
        window.clearInterval(timer);
        setStep(index);
      });
      card.addEventListener("mouseleave", function () {
        window.clearInterval(timer);
        timer = window.setInterval(function () {
          setStep(step + 1);
        }, STEP_MS);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

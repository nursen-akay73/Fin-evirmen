(function () {
  var KEY = "fc-intro";
  var overlay = document.getElementById("logo-intro");
  if (!overlay) {
    return;
  }

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function seen() {
    try {
      return sessionStorage.getItem(KEY) === "1";
    } catch (error) {
      return false;
    }
  }

  function mark() {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch (error) {}
  }

  function finish() {
    overlay.classList.add("is-out");
    document.documentElement.classList.remove("fc-intro");
    window.dispatchEvent(new Event("fc-intro-done"));
    mark();
    window.setTimeout(function () {
      overlay.remove();
    }, 780);
  }

  function start() {
    if (seen() || reducedMotion()) {
      overlay.remove();
      document.documentElement.classList.remove("fc-intro");
      window.dispatchEvent(new Event("fc-intro-done"));
      return;
    }
    document.documentElement.classList.add("fc-intro");
    overlay.classList.add("is-in");
    window.setTimeout(finish, 2400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

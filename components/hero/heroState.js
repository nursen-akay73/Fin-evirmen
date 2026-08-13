export const heroState = {
  scroll: 0,
  pointerX: 0,
  pointerY: 0,
  fps: 0,
  cam: [0, 0, 0],
  meshes: [],
  reducedMotion: false,
  debug: false,
};

export function bindHeroInput(root) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  heroState.reducedMotion = reduced;
  heroState.debug = false;

  const onScroll = () => {
    const max = Math.max(root.offsetHeight * 0.7, 1);
    heroState.scroll = Math.min(1, window.scrollY / max);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (reduced) {
    return;
  }
  root.addEventListener("pointermove", (event) => {
    const rect = root.getBoundingClientRect();
    heroState.pointerX = (event.clientX - rect.left) / rect.width - 0.5;
    heroState.pointerY = (event.clientY - rect.top) / rect.height - 0.5;
  });
  root.addEventListener("pointerleave", () => {
    heroState.pointerX = 0;
    heroState.pointerY = 0;
  });
}

export function pulseLogo() {
  window.dispatchEvent(new CustomEvent("fintech-gl-pulse"));
}

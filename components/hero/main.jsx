import { createRoot } from "react-dom/client";
import { FintechHero } from "./FintechHero.jsx";
import { bindHeroInput } from "./heroState.js";

const host = document.querySelector("[data-hero-gl-root]");
const hero = document.getElementById("hero");

if (host && hero) {
  bindHeroInput(hero);
  createRoot(host).render(<FintechHero />);
}

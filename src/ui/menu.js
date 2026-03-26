export function createMenu() {
  const el = document.createElement("div");
  el.id = "menu";
  el.hidden = true;

  // aqui você coloca o seu HTML do menu como quiser
  el.innerHTML = `
    <div class="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-black/40 p-4 text-white backdrop-blur-md">
      <div id="menu-title" class="text-lg font-semibold"></div>
      <div id="menu-desc" class="text-sm opacity-90"></div>
    </div>
  `;

  const titleEl = el.querySelector("#menu-title");
  const descEl = el.querySelector("#menu-desc");

  document.body.appendChild(el);

  return {
    el,
    setTitle(t) {
      if (titleEl) titleEl.textContent = t;
    },
    setDesc(d) {
      if (descEl) descEl.textContent = d;
    },
    show() {
      el.hidden = false;
    },
    hide() {
      el.hidden = true;
    },
    destroy() {
      el.remove();
    },
  };
}
export function createNavAR({ onPrev, onNext }) {
  const el = document.createElement("div");
  el.id = "nav-ar";
  el.className = "fixed inset-0 z-50 flex items-center justify-between px-4";
  el.hidden = true;

  el.innerHTML = `
    <button id="prev" type="button"
      class="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60 active:scale-95">
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>

    <button id="next" type="button"
      class="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60 active:scale-95">
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  `;

  el.querySelector("#prev")?.addEventListener("click", onPrev);
  el.querySelector("#next")?.addEventListener("click", onNext);

  document.body.appendChild(el);

  return {
    el,
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
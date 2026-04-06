export function createHelloOverlay({
  title = "CYM'AR'",
  message = "Explore a experiência WebXR em Realidade Aumentada.",
  root = document.body,
} = {}) {
  const el = document.createElement("div");
  el.id = "hello-overlay";
  el.className =
    "fixed inset-0 z-50 grid place-items-center bg-emerald-950/75 text-white backdrop-blur";

  el.innerHTML = `
    <div class=" w-80 rounded-3xl border border-emerald-400/25 bg-white/5 p-7 text-center shadow-2xl shadow-black/50">
    
      <h1 id="hello-title" class="mt-4 text-3xl font-semibold tracking-tight text-emerald-50 sm:text-5xl"></h1>

      <p id="hello-message" class="mx-auto mt-3 max-w-prose text-sm leading-relaxed text-emerald-50/80 sm:text-base"></p>

        <div class="rounded-2xl border border-emerald-300/15 bg-black/20 px-5 py-4 text-left mt-10">
          <p class="text-sm font-semibold text-emerald-50">Dica de tracking</p>
          <p class="mt-1 text-sm text-emerald-50/75">
            Boa iluminação e marcador bem enquadrado melhoram a estabilidade.
          </p>
        </div>
      </div>
    </div>
  `;

  root.appendChild(el);

  const titleEl = el.querySelector("#hello-title");
  const msgEl = el.querySelector("#hello-message");
  const startSlot = el.querySelector("#start-slot");

  titleEl.textContent = title;
  msgEl.textContent = message;

  return {
    el,
    startSlot, // se quiser encaixar o ARButton no card: createARSessionButton({ root: startSlot, ... })
    show() {
      el.classList.remove("hidden");
    },
    hide() {
      el.classList.add("hidden");
    },
    setTitle(nextTitle) {
      titleEl.textContent = nextTitle;
    },
    setMessage(nextMessage) {
      msgEl.textContent = nextMessage;
    },
    destroy() {
      el.remove();
    },
  };
}
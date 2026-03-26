import { ARButton } from "three/addons/webxr/ARButton.js";

export function createARSessionButton({
  renderer,
  trackedImageBitmap,
  widthInMeters = 0.2,
  root = document.body, // onde o botão vai ficar no DOM
  domOverlayRoot = document.body,
} = {}) {
  if (!renderer) throw new Error("createARSessionButton: renderer is required");
  if (!trackedImageBitmap)
    throw new Error("createARSessionButton: trackedImageBitmap is required");

  const el = ARButton.createButton(renderer, {
    requiredFeatures: ["image-tracking"],
    trackedImages: [{ image: trackedImageBitmap, widthInMeters }],
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: domOverlayRoot },
  });

  root.appendChild(el);

  return {
    el,

    show() {
      el.style.display = "";
    },

    hide() {
      el.style.display = "none";
    },

    destroy() {
      el.remove();
    },
  };
}
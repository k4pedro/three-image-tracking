import "./style.css";
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Group,
  Clock,
  AnimationMixer,
  LoopRepeat,
  SRGBColorSpace
} from "three";
import { createNavAR } from "/src/ui/navAR.js";
import { fadeInObject } from "/src/three/fade.js";

import { createLight } from "/src/three/light.js";
import { loadModelsOnce } from "/src/three/loadModels.js";

import { createImageAnchorTracker } from "/src/ar/trackingImageAnchor.js";
import { createARSessionButton } from "/src/ar/createARSessionButton.js";
import { createHelloOverlay } from "/src/ui/helloOverlay.js";

const hello = createHelloOverlay();

const items = [
  {
    url: "/models/assets_hnk/hnk_bottle_text_curve_animated/bottle_text_curve.glb",
    scale: 0.05
  },
  {
    url: "/models/assets_hnk/bottle_text_curve_zero/bottle_text_curve_zero.glb",
    scale: 0.05,
  },

];

function waitForImage(imgEl) {
  if (!imgEl) throw new Error("waitForImage: imgEl is required");
  if (imgEl.complete && imgEl.naturalWidth > 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    imgEl.addEventListener("load", resolve, { once: true });
    imgEl.addEventListener(
      "error",
      () => reject(new Error("Erro carregando imagem: " + imgEl.src)),
      { once: true }
    );
  });
}

let camera, scene, renderer;
let hiroAnchor;

let nav;
let tracker;
let lighting;
let arButton;

let wasTrackedRecently = false;

let entries = [];          // [{ root, animations, url }]
let models = [];           // [Object3D]
let mixers = [];           // [AnimationMixer|null]
let actions = [];          // [AnimationAction|null]

let activeIndex = 0;
let modelsLoaded = false;

const clock = new Clock();

function setActiveModel(nextIndex) {
  if (!models.length) return;

  activeIndex = (nextIndex + models.length) % models.length;

  for (let i = 0; i < models.length; i++) {
    models[i].visible = i === activeIndex;
  }

  // opcional: tocar só a animação do modelo ativo
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    if (!a) continue;
    if (i === activeIndex) a.reset().play();
    else a.stop();
  }

  if (tracker?.isRecentlyTracked(500)) {
    const obj = models[activeIndex];
    if (obj) fadeInObject(obj, 350);
  }
}

function setupAnimations() {
  mixers = [];
  actions = [];

  for (let i = 0; i < entries.length; i++) {
    const { root, animations } = entries[i];

    if (!animations || animations.length === 0) {
      mixers[i] = null;
      actions[i] = null;
      continue;
    }

    const mixer = new AnimationMixer(root);
    mixers[i] = mixer;

    // Toca o primeiro clip.
    // (Se você tiver nome no Blender, dá pra selecionar pelo name.)
    const clip = animations[0];
    const action = mixer.clipAction(clip);

    action.setLoop(LoopRepeat, Infinity);
    action.play();

    actions[i] = action;
  }
}

async function ensureModelsLoaded() {
  if (modelsLoaded) return;
  modelsLoaded = true;

  entries = await loadModelsOnce({ items, parent: hiroAnchor });
  models = entries.map((e) => e.root);

  setupAnimations();
  setActiveModel(0);
}

async function init() {
  hello.show();

  scene = new Scene();

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.xr.enabled = true;

  (document.querySelector("#scene-container") || document.body).appendChild(
    renderer.domElement
  );

  lighting = createLight({
    scene,
    renderer,
    hdriUrl: "/hdr/studio_small_08_1k.hdr",
    exposure: 0.85,
    environmentIntensity: 0.7,
  });
  await lighting.init();

  hiroAnchor = new Group();
  hiroAnchor.matrixAutoUpdate = false;
  hiroAnchor.visible = false;
  scene.add(hiroAnchor);

  nav = createNavAR({
    onPrev: () => setActiveModel(activeIndex - 1),
    onNext: () => setActiveModel(activeIndex + 1),
  });
  nav.hide();

  tracker = createImageAnchorTracker({
    renderer,
    anchor: hiroAnchor,
    imageIndex: 0,
  });

  const imgMarkerHiro = document.getElementById("imgMarkerHiro");
  if (!imgMarkerHiro) {
    console.error("Imagem target não encontrada (#imgMarkerHiro)");
    return;
  }

  await waitForImage(imgMarkerHiro);
  const imgMarkerHiroBitmap = await createImageBitmap(imgMarkerHiro);

  arButton = createARSessionButton({
    renderer,
    trackedImageBitmap: imgMarkerHiroBitmap,
    widthInMeters: 0.2,
    root: document.body,
    domOverlayRoot: document.body,
  });

  renderer.xr.addEventListener("sessionstart", async () => {
    hello.hide();
    tracker.reset();
    wasTrackedRecently = false;
    nav.show();
    await ensureModelsLoaded();
  });

  renderer.xr.addEventListener("sessionend", () => {
    window.location.reload();
    tracker.reset();
    wasTrackedRecently = false;
    nav.hide();
    // opcional: parar animação quando sair
    for (const a of actions) a?.stop();
  });

  renderer.setAnimationLoop(render);
  window.addEventListener("resize", onResize);

  // pré-carrega (igual ao seu)
  await ensureModelsLoaded();
}

function render(timestamp, frame) {
  const dt = clock.getDelta();

  // Atualiza animações (ou só mixers[activeIndex] se preferir)
  for (const mixer of mixers) mixer?.update(dt);

  if (!models.length) {
    renderer.render(scene, camera);
    return;
  }

  tracker.update(frame);

  const trackedRecently = tracker.isRecentlyTracked(500);

  if (trackedRecently && !wasTrackedRecently) {
    const obj = models[activeIndex];
    if (obj) fadeInObject(obj, 450);
  }
  wasTrackedRecently = trackedRecently;

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
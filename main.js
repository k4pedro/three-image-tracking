import "./style.css";
import * as THREE from "three";

import { createNavAR } from "/src/ui/navAR.js";
import { fadeInObject } from "/src/three/fade.js";

import { createLight } from "/src/three/light.js";
import { loadModelsOnce } from "/src/three/loadModels.js";

import { createImageAnchorTracker } from "/src/ar/trackingImageAnchor.js";
import { createARSessionButton } from "/src/ar/createARSessionButton.js";

const items = [
  {
    url: "/models/assets_hnk/garrafa_hnk/garrafa_hnk.glb",
    title: "Garrafa",
    desc: "Garrafa Heineken",
    scale: 0.03,
    position: { x: 0, y: 0.02, z: 0 },
  },
  {
    url: "/models/assets_hnk/taca_hnk/taca_hnk.glb",
    title: "Taça",
    desc: "Taça Heineken",
    scale: 0.03,
    position: { x: 0, y: 0.02, z: 0 },
  },
  {
    url: "/models/assets_hnk/lata_hnk/lata_hnk.glb",
    title: "Lata",
    desc: "Lata Heineken",
    scale: 0.03,
    position: { x: 0, y: 0.02, z: 0 },
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

let models = [];
let activeIndex = 0;
let modelsLoaded = false;

function setActiveModel(nextIndex) {
  if (!models.length) return;

  activeIndex = (nextIndex + models.length) % models.length;

  for (let i = 0; i < models.length; i++) {
    models[i].visible = i === activeIndex;
  }

  // Fade ao trocar de modelo (igual ao antigo)
  if (tracker?.isRecentlyTracked(500)) {
    const obj = models[activeIndex];
    if (obj) fadeInObject(obj, 350);
  }
}

async function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
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

  hiroAnchor = new THREE.Group();
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
    tracker.reset();
    wasTrackedRecently = false;
    nav.show();

    if (!modelsLoaded) {
      modelsLoaded = true;
      models = await loadModelsOnce({ items, parent: hiroAnchor });
      setActiveModel(0);
    }
  });

  renderer.xr.addEventListener("sessionend", () => {
    tracker.reset();
    wasTrackedRecently = false;
    nav.hide();
  });

  renderer.setAnimationLoop(render);
  window.addEventListener("resize", onResize);
  if (!modelsLoaded) {
    modelsLoaded = true;
    models = await loadModelsOnce({ items, parent: hiroAnchor });
    setActiveModel(0);
  }
}

function render(timestamp, frame) {

  if (!models.length) {
    renderer.render(scene, camera);
    return;
  }

  tracker.update(frame);

  const trackedRecently = tracker.isRecentlyTracked(500);

  // Fade quando o marker reaparece (igual ao antigo)
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
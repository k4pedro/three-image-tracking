import "./style.css";
import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let camera, scene, renderer;
let hiroAnchor;
let lastSeen = 0;

let menu, menuTitle, menuDesc, navAR;
let models = [];
let activeIndex = 0;
let modelsLoaded = false;

let wasTrackedRecently = false;

const items = [
  {
    url: "/models/duff_semMolde/duff_semMolde.glb",
    title: "Duff Beer",
    desc: "Garrafa Duff",
    scale: 0.05,
    position: { x: 0, y: 0.02, z: 0 },
  },
  {
    url: "/models/duff_expo/duff_expo.glb",
    title: "Duff Beer",
    desc: "Garrafa Duff",
    scale: 0.05,
    position: { x: 0, y: 0.02, z: 0 },
  },
  {
    url: "/models/hnk_bottle/hnk_semMolde.glb",
    title: "Heineken",
    desc: "Garrafa Heineken",
    scale: 0.05,
    position: { x: 0, y: 0.02, z: 0 },
  },
];

function waitForImage(imgEl) {
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

// --- Fade no Three.js (material.opacity) ---
function setOpacityRecursive(root, opacity) {
  root.traverse((child) => {
    if (!child.isMesh) return;

    // importante: se vários meshes compartilham material, clona pra não afetar outros
    if (Array.isArray(child.material)) {
      child.material = child.material.map((m) => (m ? m.clone() : m));
    } else if (child.material) {
      child.material = child.material.clone();
    }

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const m of mats) {
      if (!m) continue;
      m.transparent = true;
      m.opacity = opacity;
      m.depthWrite = opacity >= 1; // ajuda a evitar artefatos quando transparente
      m.needsUpdate = true;
    }
  });
}

function fadeInObject(root, durationMs = 450) {
  const start = performance.now();
  setOpacityRecursive(root, 0);

  function step(now) {
    const t = Math.min(1, (now - start) / durationMs);
    setOpacityRecursive(root, t);
    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
// -----------------------------------------

function setActiveModel(index) {
  if (models.length === 0) return;

  activeIndex = (index + models.length) % models.length;

  for (let i = 0; i < models.length; i++) {
    models[i].visible = i === activeIndex;
  }

  if (menuTitle) menuTitle.innerText = items[activeIndex]?.title ?? `Modelo ${activeIndex + 1}`;
  if (menuDesc) menuDesc.innerText = items[activeIndex]?.desc ?? `Mostrando ${activeIndex + 1}/${models.length}`;

  // se o marker estiver visível, dá fade no modelo recém-ativado
  const trackedRecently = Date.now() - lastSeen < 500;
  if (trackedRecently) {
    const obj = models[activeIndex];
    if (obj) fadeInObject(obj, 350);
  }
}

function setupDomRefs() {
  menu = document.getElementById("menu");
  menuTitle = document.getElementById("menu-title");
  menuDesc = document.getElementById("menu-desc");
  navAR = document.getElementById("nav-ar");
}

function setupUiEvents() {
  document.getElementById("prev")?.addEventListener("click", () => setActiveModel(activeIndex - 1));
  document.getElementById("next")?.addEventListener("click", () => setActiveModel(activeIndex + 1));
}

function hideARUI() {
  navAR?.classList.add("hidden");
  menu?.classList.add("hidden");
}

function showARUI() {
  navAR?.classList.remove("hidden");
}

async function loadModelsOnce() {
  if (modelsLoaded) return;
  modelsLoaded = true;
  
  const loader = new GLTFLoader();

  for (const item of items) {
    const gltf = await loader.loadAsync(item.url);
    const obj = gltf.scene;

    obj.scale.setScalar(item.scale ?? 1);

    if (item.rotation) {
      obj.rotation.set(item.rotation.x ?? 0, item.rotation.y ?? 0, item.rotation.z ?? 0);
    }
    if (item.position) {
      obj.position.set(item.position.x ?? 0, item.position.y ?? 0, item.position.z ?? 0);
    }

    obj.visible = false;
    hiroAnchor.add(obj);
    models.push(obj);
  }

  setActiveModel(0);
}

init();

async function init() {
  setupDomRefs();
  setupUiEvents();
  hideARUI();

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  renderer.setAnimationLoop(render);

  (document.querySelector("#scene-container") || document.body).appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));

  hiroAnchor = new THREE.Group();
  hiroAnchor.matrixAutoUpdate = false;
  hiroAnchor.visible = false;
  scene.add(hiroAnchor);

  const imgMarkerHiro = document.getElementById("imgMarkerHiro");
  if (!imgMarkerHiro) {
    console.error("Imagem target não encontrada (#imgMarkerHiro)");
    return;
  }

  await waitForImage(imgMarkerHiro);
  const imgMarkerHiroBitmap = await createImageBitmap(imgMarkerHiro);

  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["image-tracking"],
    trackedImages: [{ image: imgMarkerHiroBitmap, widthInMeters: 0.2 }],
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: document.body },
  });
  document.body.appendChild(button);

  renderer.xr.addEventListener("sessionstart", async () => {
    lastSeen = 0;
    wasTrackedRecently = false;
    hiroAnchor.visible = false;

    showARUI();
    await loadModelsOnce();
  });

  renderer.xr.addEventListener("sessionend", () => {
    lastSeen = 0;
    wasTrackedRecently = false;
    hiroAnchor.visible = false;
    hideARUI();
  });
}

function render(timestamp, frame) {
  if (frame) {
    const results = frame.getImageTrackingResults();
    hiroAnchor.visible = false;

    for (const result of results) {
      const referenceSpace = renderer.xr.getReferenceSpace();
      const pose = frame.getPose(result.imageSpace, referenceSpace);
      if (!pose) continue;

      if (result.index === 0 && result.trackingState === "tracked") {
        lastSeen = Date.now();
        hiroAnchor.visible = true;
        hiroAnchor.matrix.fromArray(pose.transform.matrix);
      }
    }
  }

  // UI
  const trackedRecently = Date.now() - lastSeen < 500;
  if (menu) menu.classList.toggle("hidden", !trackedRecently);

  // disparar fade quando o marker "aparecer"
  if (trackedRecently && !wasTrackedRecently) {
    const obj = models[activeIndex];
    if (obj) fadeInObject(obj, 450);
  }
  wasTrackedRecently = trackedRecently;

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
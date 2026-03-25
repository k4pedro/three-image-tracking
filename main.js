// ===============================
// 1) Imports
// ===============================
import "./style.css";
import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
// ===============================
// 2) Estado global (Three + app)
// ===============================
let camera, scene, renderer;
let hiroAnchor;

// tracking state
let lastSeen = 0;
let wasTrackedRecently = false;

// UI state
let menu, menuTitle, menuDesc, navAR;

// models state
let models = [];
let activeIndex = 0;
let modelsLoaded = false;

// ===============================
// 3) Configuração (lista de modelos)
// ===============================
const items = [
  {
    url: "/models/assets_hnk/garrafa_hnk/garrafa_hnk.glb",
    title: "Garrafa",
    desc: "Garrafa Heineken",
    scale: 0.05,
    position: { x: 0, y: 0.02, z: 0 },
  },
  {
    url: "/models/assets_hnk/taca_hnk/taca_hnk.glb",
    title: "Taça",
    desc: "Taça Heineken",
    scale: 0.05,
    position: { x: 0, y: 0.02, z: 0 },
  },
  {
    url: "/models/assets_hnk/lata_hnk/lata_hnk.glb",
    title: "Lata",
    desc: "Lata Heineken",
    scale: 0.05,
    position: { x: 0, y: 0.02, z: 0 },
  },
];

// ===============================
// 4) Utils (helpers)
// ===============================
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

// ===============================
// 5) Efeitos visuais (fade)
// ===============================
function setOpacityRecursive(root, opacity) {
  root.traverse((child) => {
    if (!child.isMesh) return;

    // clonar materiais para não afetar meshes que compartilham material
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
      m.depthWrite = opacity >= 1;
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

// ===============================
// 6) UI (DOM + eventos)
// ===============================
function setupDomRefs() {
  menu = document.getElementById("menu");
  menuTitle = document.getElementById("menu-title");
  menuDesc = document.getElementById("menu-desc");
  navAR = document.getElementById("nav-ar");
}

function setupUiEvents() {
  document
    .getElementById("prev")
    ?.addEventListener("click", () => setActiveModel(activeIndex - 1));
  document
    .getElementById("next")
    ?.addEventListener("click", () => setActiveModel(activeIndex + 1));
}

function hideARUI() {
  navAR?.classList.add("hidden");
  menu?.classList.add("hidden");
}

function showARUI() {
  navAR?.classList.remove("hidden");
}

// ===============================
// 7) Modelos (carregar + trocar)
// ===============================
function setActiveModel(index) {
  if (models.length === 0) return;

  activeIndex = (index + models.length) % models.length;

  for (let i = 0; i < models.length; i++) {
    models[i].visible = i === activeIndex;
  }

  if (menuTitle)
    menuTitle.innerText = items[activeIndex]?.title ?? `Modelo ${activeIndex + 1}`;
  if (menuDesc)
    menuDesc.innerText =
      items[activeIndex]?.desc ?? `Mostrando ${activeIndex + 1}/${models.length}`;

  // se o marker estiver visível, dá fade no modelo recém-ativado
  const trackedRecently = Date.now() - lastSeen < 500;
  if (trackedRecently) {
    const obj = models[activeIndex];
    if (obj) fadeInObject(obj, 350);
  }
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
      obj.rotation.set(
        item.rotation.x ?? 0,
        item.rotation.y ?? 0,
        item.rotation.z ?? 0
      );
    }
    if (item.position) {
      obj.position.set(
        item.position.x ?? 0,
        item.position.y ?? 0,
        item.position.z ?? 0
      );
    }

    obj.visible = false;
    hiroAnchor.add(obj);
    models.push(obj);
  }

  setActiveModel(0);
}

// ===============================
// 8) Setup Three + WebXR (init)
// ===============================

// Lights 
async function setupLighting() {
  // 1) Tone mapping / exposure (muito importante com HDRI)
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85; // baixa um pouco para evitar estouro

  // Luz “de céu/chão” 
  const hemi = new THREE.HemisphereLight(0xffffff, 0xbfd3ff, 0.45);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 15);
  sun.position.set(2.0, 3.0, 2.0); 
  scene.add(sun);

  // Um fill leve para não esmagar as sombras
  const amb = new THREE.AmbientLight(0xffffff, 0.08);
  scene.add(amb);
  const fill = new THREE.DirectionalLight(0xffffff, 0.25);
  fill.position.set(-2.0, 1.5, -1.5); 
  scene.add(fill);

  // 3) Environment (IBL) — principal para vidro/metais
  // Coloque um HDRI em: public/hdr/studio_small_08_1k.hdr (exemplo)
  const hdrUrl = "/hdr/studio_small_08_1k.hdr";

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  await new Promise((resolve) => {
    new RGBELoader().load(
      hdrUrl,
      (hdrEquirect) => {
        const envMap = pmrem.fromEquirectangular(hdrEquirect).texture;

        scene.environment = envMap;
        // Em AR, normalmente NÃO usar background:
        // scene.background = envMap;

        hdrEquirect.dispose();
        pmrem.dispose();

        // Se sua versão do Three suportar, isso controla a força do HDRI:
        // (nem todas têm)
        if ("environmentIntensity" in scene) {
          scene.environmentIntensity = 0.7; // 0.4–1.0
        }

        resolve();
      },
      undefined,
      () => {
        console.warn("Falha ao carregar HDRI:", hdrUrl);
        pmrem.dispose();
        resolve(); // não quebra a app
      }
    );
  });
}

init();

async function init() {
  setupDomRefs();
  setupUiEvents();
  hideARUI();

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
  renderer.setAnimationLoop(render);

  (document.querySelector("#scene-container") || document.body).appendChild(
    renderer.domElement
  );

  // Luz (por enquanto)

  await setupLighting();

  // Anchor (onde os modelos ficam)
  hiroAnchor = new THREE.Group();
  hiroAnchor.matrixAutoUpdate = false;
  hiroAnchor.visible = false;
  scene.add(hiroAnchor);

  // Marker image
  const imgMarkerHiro = document.getElementById("imgMarkerHiro");
  if (!imgMarkerHiro) {
    console.error("Imagem target não encontrada (#imgMarkerHiro)");
    return;
  }

  await waitForImage(imgMarkerHiro);
  const imgMarkerHiroBitmap = await createImageBitmap(imgMarkerHiro);

  // AR Button / session
  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["image-tracking"],
    trackedImages: [{ image: imgMarkerHiroBitmap, widthInMeters: 0.2 }],
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: document.body },
  });
  document.body.appendChild(button);

  // XR session lifecycle
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

// ===============================
// 9) Render loop (tracking + UI + draw)
// ===============================
function render(timestamp, frame) {
  if (frame) {
    const results = frame.getImageTrackingResults();
    hiroAnchor.visible = false;

    for (const result of results) {
      const referenceSpace = renderer.xr.getReferenceSpace();
      const pose = frame.getPose(result.imageSpace, referenceSpace);
      if (!pose) continue;

      const isTracking = result.trackingState === "tracked" || result.trackingState === "emulated";

      if (result.index === 0 && isTracking) {
        lastSeen = Date.now();
        hiroAnchor.visible = true;
        hiroAnchor.matrix.fromArray(pose.transform.matrix);
      }
    }
  }

  // UI visível só quando marker foi visto recentemente
  const trackedRecently = Date.now() - lastSeen < 500;
  if (menu) menu.classList.toggle("hidden", !trackedRecently);

  // fade quando o marker reaparece
  if (trackedRecently && !wasTrackedRecently) {
    const obj = models[activeIndex];
    if (obj) fadeInObject(obj, 450);
  }
  wasTrackedRecently = trackedRecently;

  renderer.render(scene, camera);
}

// ===============================
// 10) Eventos globais (resize)
// ===============================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
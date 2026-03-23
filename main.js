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

function setActiveModel(index) {
  if (models.length === 0) return;

  activeIndex = (index + models.length) % models.length;

  for (let i = 0; i < models.length; i++) {
    models[i].visible = i === activeIndex;
  }

  if (menuTitle) menuTitle.innerText = items[activeIndex]?.title ?? `Modelo ${activeIndex + 1}`;
  if (menuDesc) menuDesc.innerText = items[activeIndex]?.desc ?? `Mostrando ${activeIndex + 1}/${models.length}`;
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
  // As setas podem aparecer assim que iniciar a sessão AR
  navAR?.classList.remove("hidden");
  // O menu continua aparecendo só quando detectar o marker (controlado pelo lastSeen no render)
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

  // Só depois de apertar "Start AR"
  renderer.xr.addEventListener("sessionstart", async () => {
    lastSeen = 0;
    hiroAnchor.visible = false;

    showARUI();
    await loadModelsOnce();
  });

  renderer.xr.addEventListener("sessionend", () => {
    lastSeen = 0;
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

  if (menu) {
    if (Date.now() - lastSeen < 500) menu.classList.remove("hidden");
    else menu.classList.add("hidden");
  }

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
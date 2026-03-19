import "./style.css";
import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let camera, scene, renderer;
let hiroAnchor, earthAnchor;
let lastSeen = 0;
let menu, menuTitle, menuDesc;

function waitForImage(imgEl) {
  if (imgEl.complete && imgEl.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    imgEl.addEventListener("load", resolve, { once: true });
    imgEl.addEventListener("error", () => reject(new Error("Erro carregando imagem: " + imgEl.src)), { once: true });
  });
}

init();

async function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  renderer.setAnimationLoop(render);

  (document.querySelector("#scene-container") || document.body).appendChild(renderer.domElement);

  const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  ambient.position.set(0.5, 1, 0.25);
  scene.add(ambient);

  // imagens para tracking
  const imgMarkerHiro = document.getElementById("imgMarkerHiro");
  const imgNFTEarth = document.getElementById("imgNFTEarth");
  if (!imgMarkerHiro || !imgNFTEarth) {
    console.error("Imagens não encontradas no HTML!");
    return;
  }

  await Promise.all([waitForImage(imgMarkerHiro), waitForImage(imgNFTEarth)]);

  const imgMarkerHiroBitmap = await createImageBitmap(imgMarkerHiro);
  const imgNFTEarthBitmap = await createImageBitmap(imgNFTEarth);

  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["image-tracking"],
    trackedImages: [
      { image: imgMarkerHiroBitmap, widthInMeters: 0.2 },
      { image: imgNFTEarthBitmap, widthInMeters: 0.2 },
    ],
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: document.body },
  });
  document.body.appendChild(button);

  // anchors (recebem a matriz do tracking)
  hiroAnchor = new THREE.Group();
  hiroAnchor.matrixAutoUpdate = false;
  hiroAnchor.visible = false;
  scene.add(hiroAnchor);

  earthAnchor = new THREE.Group();
  earthAnchor.matrixAutoUpdate = false;
  earthAnchor.visible = false;
  scene.add(earthAnchor);

  // carregar modelo para o target 0
  const loader = new GLTFLoader();
  loader.load(
    "/models/beer_bottle/scene.gltf", // confirme que abre no navegador
    (gltf) => {
      const garrafa = gltf.scene;

      // Agora sim: escala/rotação/offset funcionam, porque o modelo está dentro do anchor
      garrafa.scale.setScalar(0.004);     // comece pequeno; ajuste: 0.01~0.1
       // teste remover se ficar estranho
      garrafa.position.y = 0.02;         // sobe um pouco acima do marcador

      hiroAnchor.add(garrafa);
      console.log("Garrafa pronta no hiroAnchor");
    },
    undefined,
    (err) => console.error("Erro ao carregar modelo:", err)
  );

  // menu
  menu = document.getElementById("menu");
  menuTitle = document.getElementById("menu-title");
  menuDesc = document.getElementById("menu-desc");
}

function render(timestamp, frame) {
  if (frame) {
    const results = frame.getImageTrackingResults();

    // por padrão esconde; vai mostrar quando tracked
    hiroAnchor.visible = false;
    earthAnchor.visible = false;

    for (const result of results) {
      const referenceSpace = renderer.xr.getReferenceSpace();
      const pose = frame.getPose(result.imageSpace, referenceSpace);
      if (!pose) continue;

      if (result.trackingState === "tracked") {
        lastSeen = Date.now();

        if (result.index === 0) {
          hiroAnchor.visible = true;
          hiroAnchor.matrix.fromArray(pose.transform.matrix);

          if (menuTitle) menuTitle.innerText = "Garrafa";
          if (menuDesc) menuDesc.innerText = "Produto garrafa";
        }

        if (result.index === 1) {
          earthAnchor.visible = true;
          earthAnchor.matrix.fromArray(pose.transform.matrix);

          if (menuTitle) menuTitle.innerText = "Frango";
          if (menuDesc) menuDesc.innerText = "Delicioso frango 🍗";
        }
      }
    }
  }

  // menu anti-flicker
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
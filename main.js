import './style.css'
import * as THREE from "three"
import { ARButton } from "three/addons/webxr/ARButton.js"

let camera, scene, renderer;
let hiroMarkerMesh, earthNFTMesh;

init();

async function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  renderer.setAnimationLoop(render);

  // 🔥 evita erro se container não existir
  const container = document.querySelector("#scene-container") || document.body;
  container.appendChild(renderer.domElement);

  // luz
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

  const imgMarkerHiroBitmap = await createImageBitmap(imgMarkerHiro);
  const imgNFTEarthBitmap = await createImageBitmap(imgNFTEarth);

  // botão AR
  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["image-tracking"],
    trackedImages: [
      {
        image: imgMarkerHiroBitmap,
        widthInMeters: 0.2,
      },
      {
        image: imgNFTEarthBitmap,
        widthInMeters: 0.2,
      },
    ],
    optionalFeatures: ["dom-overlay"],
    domOverlay: {
      root: document.body
    },
  });

  document.body.appendChild(button);

  // 🔵 cubo 1 (hiro)
  const hiroGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const hiroMaterial = new THREE.MeshNormalMaterial({
    transparent: true,
    opacity: 0.5,
  });

  hiroMarkerMesh = new THREE.Mesh(hiroGeometry, hiroMaterial);
  hiroMarkerMesh.matrixAutoUpdate = false;
  hiroMarkerMesh.visible = false;
  scene.add(hiroMarkerMesh);

  // 🔴 cubo 2 (earth)
  const earthGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const earthMaterial = new THREE.MeshNormalMaterial();

  earthNFTMesh = new THREE.Mesh(earthGeometry, earthMaterial);
  earthNFTMesh.matrixAutoUpdate = false;
  earthNFTMesh.visible = false;
  scene.add(earthNFTMesh);
}

function render(timestamp, frame) {
  if (frame) {
    const results = frame.getImageTrackingResults();

    for (const result of results) {

      const imageIndex = result.index;
      const referenceSpace = renderer.xr.getReferenceSpace();
      const pose = frame.getPose(result.imageSpace, referenceSpace);

      if (!pose) continue;

      const state = result.trackingState;

      if (state === "tracked") {

        if (imageIndex === 0) {
          hiroMarkerMesh.visible = true;
          hiroMarkerMesh.matrix.fromArray(pose.transform.matrix);
        }

        if (imageIndex === 1) {
          earthNFTMesh.visible = true;
          earthNFTMesh.matrix.fromArray(pose.transform.matrix);
        }

      } else {
        // opcional: esconder quando perder tracking
        if (imageIndex === 0) hiroMarkerMesh.visible = false;
        if (imageIndex === 1) earthNFTMesh.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
}

// resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
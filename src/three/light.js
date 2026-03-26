import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

export function createLight({
  scene,
  renderer,
  hdriUrl = "/hdr/studio_small_08_1k.hdr",
  exposure = 0.85,
  environmentIntensity = 0.7,
} = {}) {
  if (!scene) throw new Error("createLight: scene is required");
  if (!renderer) throw new Error("createLight: renderer is required");

  const lights = [];
  let pmrem = null;
  let envMap = null;

  function addBaseLights() {
    // Tone mapping / exposure
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = exposure;

    const hemi = new THREE.HemisphereLight(0xffffff, 0xbfd3ff, 0.45);
    scene.add(hemi);
    lights.push(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 12);
    sun.position.set(4, 12, 9);
    scene.add(sun);
    lights.push(sun);

    const amb = new THREE.AmbientLight(0xffffff, 0.08);
    scene.add(amb);
    lights.push(amb);

    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(-2.0, 1.5, -1.5);
    scene.add(fill);
    lights.push(fill);
  }

  async function loadHDRI() {
    pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    return new Promise((resolve) => {
      new RGBELoader().load(
        hdriUrl,
        (hdrEquirect) => {
          envMap = pmrem.fromEquirectangular(hdrEquirect).texture;
          scene.environment = envMap;

          // Em AR, normalmente não usar background:
          // scene.background = envMap;

          hdrEquirect.dispose();

          if ("environmentIntensity" in scene) {
            // nem todas as versões suportam
            scene.environmentIntensity = environmentIntensity;
          }

          resolve(true);
        },
        undefined,
        () => resolve(false)
      );
    });
  }

  addBaseLights();

  return {
    async init() {
      const ok = await loadHDRI();
      if (!ok) {
        // HDRI falhou; ainda fica com as luzes base
        // eslint-disable-next-line no-console
        console.warn("HDRI failed to load:", hdriUrl);
      }
      return ok;
    },

    dispose() {
      // remove lights
      for (const l of lights) scene.remove(l);

      // limpa environment
      if (scene.environment === envMap) scene.environment = null;

      if (envMap) envMap.dispose?.();
      envMap = null;

      if (pmrem) pmrem.dispose();
      pmrem = null;
    },
  };
}
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export async function loadModelsOnce({ items, parent }) {
  const loader = new GLTFLoader();
  const entries = [];

  for (const item of items) {
    const gltf = await loader.loadAsync(item.url);
    const root = gltf.scene;

    root.scale.setScalar(item.scale ?? 1);
    root.visible = false;
    parent.add(root);

    entries.push({
      root,
      animations: gltf.animations ?? [],
      url: item.url,
    });
  }
  return entries;
}
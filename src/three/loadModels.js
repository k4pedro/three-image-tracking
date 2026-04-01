import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export async function loadModelsOnce({ items, parent }) {
  const loader = new GLTFLoader();
  const entries = [];

  for (const item of items) {
    const gltf = await loader.loadAsync(item.url);
    const root = gltf.scene;

    root.scale.setScalar(item.scale ?? 1);

    if (item.rotation) {
      root.rotation.set(
        item.rotation.x ?? 0,
        item.rotation.y ?? 0,
        item.rotation.z ?? 0
      );
    }
    if (item.position) {
      root.position.set(
        item.position.x ?? 0,
        item.position.y ?? 0,
        item.position.z ?? 0
      );
    }

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
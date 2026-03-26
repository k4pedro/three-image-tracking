import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export async function loadModelsOnce({ items, parent }) {
  const loader = new GLTFLoader();
  const models = [];

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
    parent.add(obj);
    models.push(obj);
  }

  return models;
}
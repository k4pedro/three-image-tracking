function setOpacityRecursive(root, opacity) {
  root.traverse((child) => {
    if (!child.isMesh) return;

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

export function fadeInObject(root, durationMs = 450) {
  const start = performance.now();
  setOpacityRecursive(root, 0);

  function step(now) {
    const t = Math.min(1, (now - start) / durationMs);
    setOpacityRecursive(root, t);
    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
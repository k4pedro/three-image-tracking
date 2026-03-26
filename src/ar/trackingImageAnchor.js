export function createImageAnchorTracker({ renderer, anchor, imageIndex = 0 }) {
  let lastSeen = 0;

  function okState(state) {
    // tracked: melhor
    // emulated: ajuda a não sumir e “pegar” mais rápido em alguns aparelhos
    return state === "tracked" || state === "emulated";
  }

  return {
    update(frame, { graceMs = 1000 } = {}) {
      if (!frame) return;

      const results = frame.getImageTrackingResults();
      let gotPose = false;

      for (const result of results) {
        if (result.index !== imageIndex) continue;
        if (!okState(result.trackingState)) continue;

        const referenceSpace = renderer.xr.getReferenceSpace();
        const pose = frame.getPose(result.imageSpace, referenceSpace);
        if (!pose) continue;

        anchor.matrix.fromArray(pose.transform.matrix);
        lastSeen = Date.now();
        gotPose = true;
        break;
      }

      // mantém visível por um tempo, mesmo se perder tracking
      anchor.visible = Date.now() - lastSeen < graceMs;

      return { gotPose, lastSeen };
    },

    isRecentlyTracked(timeoutMs = 5) {
      return Date.now() - lastSeen < timeoutMs;
    },

    reset() {
      lastSeen = 0;
      anchor.visible = false;
    },

    getLastSeen() {
      return lastSeen;
    },
  };
}
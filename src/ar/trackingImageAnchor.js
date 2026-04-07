export function createImageAnchorTracker({ renderer, anchor, imageIndex = 0 }) {
  let lastSeen = 0;

  return {
    update(frame, { graceMs = 500 } = {}) {
      if (!frame) return { gotPose: false, lastSeen };

      const results = frame.getImageTrackingResults();
      let gotPose = false;

      // Se não houver resultados da API, apenas atualiza visibilidade por tempo
      if (!results || results.length === 0) {
        anchor.visible = (Date.now() - lastSeen < graceMs);
        return { gotPose, lastSeen };
      }

      for (const result of results) {
        if (result.index !== imageIndex) continue;

    
        if (result.trackingState === "tracked") {
          const referenceSpace = renderer.xr.getReferenceSpace();
          const pose = frame.getPose(result.imageSpace, referenceSpace);

          if (pose) {
            // Aplicação direta de matriz (mais performática e segura contra travas)
            anchor.matrix.fromArray(pose.transform.matrix);
            anchor.matrixWorldNeedsUpdate = true;
            
            lastSeen = Date.now();
            gotPose = true;
            break; 
          }
        }
      }

      anchor.visible = (Date.now() - lastSeen < graceMs);
      return { gotPose, lastSeen };
    },

    isRecentlyTracked(timeoutMs = 500) {
      return (Date.now() - lastSeen) < timeoutMs;
    },

    reset() {
      lastSeen = 0;
      anchor.visible = false;
    },

    getLastSeen() {
      return lastSeen;
    }
  };
}
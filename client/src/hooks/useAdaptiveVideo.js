// Hook d'adaptation vidéo selon la qualité réseau détectée
export function useAdaptiveVideo() {
  // Contraintes vidéo selon la connexion
  const getVideoConstraints = () => {
    const connection = navigator.connection ||
                       navigator.mozConnection ||
                       navigator.webkitConnection;

    if (!connection) {
      // Fallback : qualité medium
      return { width: 320, height: 240, frameRate: 15 };
    }

    const effectiveType = connection.effectiveType; // '2g', '3g', '4g'
    const downlink = connection.downlink; // Mb/s

    if (effectiveType === '2g' || downlink < 0.5) {
      // Connexion très lente — qualité minimale
      return {
        width: { ideal: 176, max: 320 },
        height: { ideal: 144, max: 240 },
        frameRate: { ideal: 8, max: 12 },
      };
    } else if (effectiveType === '3g' || downlink < 2) {
      // Connexion lente — qualité basse
      return {
        width: { ideal: 320, max: 480 },
        height: { ideal: 240, max: 360 },
        frameRate: { ideal: 15, max: 20 },
      };
    } else {
      // Bonne connexion — qualité normale
      return {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 24, max: 30 },
      };
    }
  };

  const getAudioConstraints = () => ({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    // Bitrate audio réduit pour connexions lentes
    sampleRate: 16000,
  });

  return { getVideoConstraints, getAudioConstraints };
}

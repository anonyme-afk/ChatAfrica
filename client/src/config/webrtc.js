// Config WebRTC — Serveurs TURN/STUN gratuits
// Essentiels pour traverser les NAT en Afrique (beaucoup de CGNAT)

export const RTC_CONFIG = {
  iceServers: [
    // Google STUN (gratuit, fiable)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Cloudflare STUN (gratuit, rapide en Afrique)
    { urls: 'stun:stun.cloudflare.com:3478' },
    // Open Relay TURN gratuit (fallback quand STUN échoue)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
  // Préférer UDP (plus rapide) mais fallback TCP
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

// Options WebRTC peer optimisées pour connexions lentes
export const PEER_OPTIONS = {
  config: RTC_CONFIG,
  // Encode vidéo en H264 (meilleure compression que VP8)
  offerOptions: {
    offerToReceiveVideo: true,
    offerToReceiveAudio: true,
  },
  // Délai avant abandon de la connexion
  iceCompleteTimeout: 5000,
};

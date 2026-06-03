import { useState, useEffect } from 'react';

export default function NetBanner() {
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection;

    const check = () => {
      if (!navigator.onLine) {
        setMsg('⚠️ Pas de connexion internet');
        return;
      }
      if (conn?.effectiveType === '2g') {
        setMsg('📶 Connexion très lente détectée — qualité vidéo réduite');
      } else if (conn?.effectiveType === '3g') {
        setMsg('📶 Connexion lente — qualité vidéo ajustée');
      } else {
        setMsg(null);
      }
    };

    check();
    window.addEventListener('online', check);
    window.addEventListener('offline', check);
    conn?.addEventListener('change', check);

    return () => {
      window.removeEventListener('online', check);
      window.removeEventListener('offline', check);
      conn?.removeEventListener('change', check);
    };
  }, []);

  if (!msg) return null;
  return <div className="net-banner show">{msg}</div>;
}

import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import ThemeToggle from './components/ThemeToggle';
import NetBanner from './components/NetBanner';
import { useAdaptiveVideo } from './hooks/useAdaptiveVideo';
import { PEER_OPTIONS } from './config/webrtc';

export default function App() {
  const [started, setStarted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const myVideoRef = useRef();
  const partnerVideoRef = useRef();
  const socketRef = useRef();
  const peerRef = useRef();
  const streamRef = useRef();

  const { getVideoConstraints, getAudioConstraints } = useAdaptiveVideo();

  useEffect(() => {
    // VITE_SERVER_URL est défini sur Vercel, pointe vers Render
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000';
    socketRef.current = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('partner-found', () => {
      setWaiting(false);
      setConnected(true);
      setMessages([{ text: 'Vous êtes connecté avec un inconnu !', from: 'system' }]);
    });

    socketRef.current.on('waiting', () => {
      setWaiting(true);
    });

    socketRef.current.on('init-call', ({ initiator }) => {
      peerRef.current = new SimplePeer({
        initiator,
        stream: streamRef.current,
        ...PEER_OPTIONS
      });

      peerRef.current.on('signal', data => {
        socketRef.current.emit('signal', { signal: data });
      });

      peerRef.current.on('stream', stream => {
        if (partnerVideoRef.current) {
          partnerVideoRef.current.srcObject = stream;
        }
      });

      peerRef.current.on('close', () => {
        handleDisconnect();
      });

      peerRef.current.on('error', () => {
        handleDisconnect();
      });
    });

    socketRef.current.on('signal', ({ signal }) => {
      if (peerRef.current) {
        peerRef.current.signal(signal);
      }
    });

    socketRef.current.on('message', ({ text, from }) => {
      setMessages(prev => [...prev, { text, from }]);
    });

    socketRef.current.on('partner-disconnected', () => {
      handleDisconnect();
      setMessages(prev => [...prev, { text: 'L\'inconnu s\'est déconnecté.', from: 'system' }]);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const startChat = () => {
    navigator.mediaDevices.getUserMedia({
      video: getVideoConstraints(),
      audio: getAudioConstraints(),
    }).then(stream => {
      streamRef.current = stream;
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }
      setStarted(true);
      socketRef.current.emit('find-partner', { mode: 'video' });
    }).catch(err => {
      console.error('Erreur caméra:', err);
      alert('Veuillez autoriser l\'accès à la caméra et au microphone.');
    });
  };

  const nextPartner = () => {
    handleDisconnect();
    setMessages([]);
    socketRef.current.emit('next');
    socketRef.current.emit('find-partner', { mode: 'video' });
  };

  const handleDisconnect = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (partnerVideoRef.current) {
      partnerVideoRef.current.srcObject = null;
    }
    setConnected(false);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim() && connected) {
      socketRef.current.emit('message', { text: input });
      setMessages(prev => [...prev, { text: input, from: 'mine' }]);
      setInput('');
    }
  };

  if (!started) {
    return (
      <div className="landing">
        <NetBanner />
        <ThemeToggle />
        <h1 className="landing-title">Chat<em>Africa</em> 🌍</h1>
        <p className="landing-sub">Chat vidéo aléatoire optimisé pour l'Afrique.</p>
        <div className="landing-card">
          <button className="start-btn" onClick={startChat}>Démarrer Vidéo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-main">
      <NetBanner />
      <header className="header">
        <div className="logo">🌍 <span>ChatAfrica</span></div>
        <ThemeToggle />
      </header>

      <div className="chat-layout">
        <div className="videos-row">
          <div className="video-box">
            <video ref={myVideoRef} autoPlay playsInline muted />
            <div className="video-label you">Vous</div>
          </div>
          <div className="video-box">
            {connected ? (
              <video ref={partnerVideoRef} autoPlay playsInline />
            ) : (
              <div className="video-placeholder">
                <div>⏳</div>
                <p>{waiting ? "Recherche..." : "En attente"}</p>
              </div>
            )}
            <div className="video-label">Inconnu</div>
          </div>
          <div className="actions-bar">
            <button className="btn btn-danger" onClick={nextPartner} style={{ width: '100%' }}>Suivant ⏭</button>
          </div>
        </div>

        <div className="chat-box">
          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.from}`}>{m.text}</div>
            ))}
          </div>
          <form className="input-row" onSubmit={sendMessage}>
            <input 
              type="text" 
              className="msg-input" 
              placeholder="Écrivez un message..." 
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={!connected}
            />
            <button type="submit" className="btn btn-primary" disabled={!connected}>Envoyer</button>
          </form>
        </div>
      </div>
    </div>
  );
}

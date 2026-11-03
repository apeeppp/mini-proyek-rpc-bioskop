import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import SeatBooking from './components/SeatBooking';
import Footer from './components/Footer';
import './index.css';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'booking'
  const [isWsConnected, setIsWsConnected] = useState(false);

  // Pantau status koneksi backend untuk Navbar
  useEffect(() => {
    let reconnectTimeout;
    let isMounted = true;
    let ws = null;

    const connectStatusWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/shows/SHOW-001`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (isMounted) setIsWsConnected(true);
      };

      ws.onclose = () => {
        if (isMounted) {
          setIsWsConnected(false);
          reconnectTimeout = setTimeout(connectStatusWs, 3000);
        }
      };

      ws.onerror = () => {
        if (ws) ws.close();
      };
    };

    connectStatusWs();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  const handleNavigate = (view) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectMovie = (movieId) => {
    if (movieId === 'SHOW-001') {
      handleNavigate('booking');
    }
  };

  return (
    <div className="ch-app-root">
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        isWsConnected={isWsConnected}
      />

      <main>
        {currentView === 'landing' ? (
          <LandingPage onSelectMovie={handleSelectMovie} />
        ) : (
          <SeatBooking
            onBackToHome={() => handleNavigate('landing')}
            isWsConnected={isWsConnected}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

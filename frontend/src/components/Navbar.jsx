import React from 'react';

export default function Navbar({ currentView, onNavigate, isWsConnected }) {
  return (
    <header className="ch-navbar">
      <div className="ch-nav-left">
        <button className="ch-brand-btn" onClick={() => onNavigate('landing')}>
          <span className="ch-logo-text">CINEMAHUB</span>
        </button>
        <nav className="ch-nav-links">
          <button
            className={`ch-nav-link ${currentView === 'landing' ? 'active' : ''}`}
            onClick={() => onNavigate('landing')}
          >
            Beranda
          </button>
          <button
            className={`ch-nav-link ${currentView === 'booking' ? 'active' : ''}`}
            onClick={() => onNavigate('booking')}
          >
            Pesan Tiket (SHOW-001)
          </button>
        </nav>
      </div>

      <div className="ch-nav-right">
        <div className="ch-status-indicator" title="Status koneksi gRPC & WebSocket">
          <span className={`ch-status-dot ${isWsConnected ? 'connected' : 'disconnected'}`}></span>
          <span className="ch-status-label">{isWsConnected ? 'Live gRPC Sync' : 'Connecting...'}</span>
        </div>

        {currentView === 'landing' ? (
          <button className="ch-cta-btn" onClick={() => onNavigate('booking')}>
            Beli Tiket
          </button>
        ) : (
          <button className="ch-translucent-btn" onClick={() => onNavigate('landing')}>
            Katalog Film
          </button>
        )}
      </div>
    </header>
  );
}

import React from 'react';

export default function Footer() {
  return (
    <footer className="ch-footer">
      <div className="ch-footer-inner">
        <div className="ch-footer-brand">
          <span className="ch-logo-text" style={{ fontSize: '1.2rem' }}>
            CINEMAHUB
          </span>
          <p className="ch-footer-tagline">
            Platform Reservasi Bioskop Terdistribusi Berbasis gRPC, Protocol Buffers & PostgreSQL.
          </p>
        </div>

        <div className="ch-footer-links">
          <div className="ch-footer-col">
            <span className="ch-footer-head">Arsitektur</span>
            <span>gRPC Protocol Buffers</span>
            <span>PostgreSQL Advisory Locks</span>
            <span>WebSocket Live Stream</span>
          </div>
          <div className="ch-footer-col">
            <span className="ch-footer-head">Navigasi</span>
            <span>Sedang Tayang</span>
            <span>Segera Hadir</span>
            <span>Studio 1 (SHOW-001)</span>
          </div>
          <div className="ch-footer-col">
            <span className="ch-footer-head">Infrastruktur</span>
            <span>Docker Compose</span>
            <span>FastAPI Gateway</span>
            <span>React + Vite</span>
          </div>
        </div>

        <div className="ch-footer-bottom">
          <p>&copy; {new Date().getFullYear()} CinemaHub Inc. Semua hak dilindungi undang-undang.</p>
          <p className="ch-footer-sub">Komputasi Paralel & Terdistribusi</p>
        </div>
      </div>
    </footer>
  );
}

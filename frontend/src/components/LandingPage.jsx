import React from 'react';
import { FEATURED_MOVIE, NOW_SHOWING_MOVIES, COMING_SOON_MOVIES } from '../data/movies';

export default function LandingPage({ onSelectMovie }) {
  return (
    <div className="ch-landing-page">
      {/* Hero Section */}
      <section className="ch-hero-section">
        <div
          className="ch-hero-backdrop"
          style={{ backgroundImage: `url(${FEATURED_MOVIE.backdropUrl})` }}
        >
          <div className="ch-hero-overlay"></div>
        </div>

        <div className="ch-hero-content">
          <div className="ch-hero-badges">
            <span className="ch-badge-live">LIVE SCREENING</span>
            <span className="ch-badge-dim">{FEATURED_MOVIE.auditorium}</span>
            <span className="ch-badge-dim">{FEATURED_MOVIE.ageRating}</span>
          </div>

          <h1 className="ch-hero-title">{FEATURED_MOVIE.title}</h1>
          <p className="ch-hero-tagline">{FEATURED_MOVIE.tagline}</p>
          <p className="ch-hero-description">{FEATURED_MOVIE.description}</p>

          <div className="ch-hero-meta">
            <span>⭐ {FEATURED_MOVIE.rating}/10</span>
            <span className="ch-dot">•</span>
            <span>{FEATURED_MOVIE.genre}</span>
            <span className="ch-dot">•</span>
            <span>{FEATURED_MOVIE.duration}</span>
          </div>

          <div className="ch-hero-actions">
            <button
              className="ch-btn-hero-primary"
              onClick={() => onSelectMovie(FEATURED_MOVIE.id)}
            >
              Pesan Kursi Sekarang &rarr;
            </button>
            <div className="ch-hero-schedule-info">
              <span className="ch-schedule-label">Jadwal Terdekat:</span>
              <span className="ch-schedule-time">{FEATURED_MOVIE.showTime}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Katalog Film: Sedang Tayang */}
      <section className="ch-section">
        <div className="ch-section-header">
          <div>
            <h2 className="ch-section-title">Sedang Tayang di Bioskop</h2>
            <p className="ch-section-subtitle">
              Pilih film favorit Anda dan nikmati pemesanan kursi instan dengan concurrency control.
            </p>
          </div>
        </div>

        <div className="ch-movies-grid">
          {NOW_SHOWING_MOVIES.map((movie, index) => (
            <div
              key={movie.id}
              className={`ch-movie-card ${movie.activeShow ? 'interactive-card' : ''}`}
              onClick={() => movie.activeShow && onSelectMovie(movie.id)}
            >
              <div className="ch-poster-wrapper">
                <img src={movie.posterUrl} alt={movie.title} className="ch-poster-img" />
                <div className="ch-poster-rank">{index + 1}</div>
                {movie.activeShow ? (
                  <span className="ch-badge-available">Pemesanan Dibuka</span>
                ) : (
                  <span className="ch-badge-full">Studio Penuh</span>
                )}
              </div>

              <div className="ch-movie-info">
                <div className="ch-movie-meta-top">
                  <span className="ch-movie-studio">{movie.studio}</span>
                  <span className="ch-movie-age">{movie.ageRating}</span>
                </div>
                <h3 className="ch-movie-title">{movie.title}</h3>
                <p className="ch-movie-genre">{movie.genre}</p>
                <div className="ch-movie-meta-bottom">
                  <span className="ch-movie-rating">★ {movie.rating}</span>
                  <span className="ch-movie-duration">{movie.duration}</span>
                </div>

                {movie.activeShow ? (
                  <button
                    className="ch-btn-card-action active"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMovie(movie.id);
                    }}
                  >
                    Beli Tiket (SHOW-001)
                  </button>
                ) : (
                  <button className="ch-btn-card-action disabled" disabled>
                    Segera Tambah Sesi
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards Showcase (Sesuai DESIGN.md - Cosmic Gradient) */}
      <section className="ch-section">
        <div className="ch-section-header">
          <div>
            <h2 className="ch-section-title">Keunggulan Teknologi Bioskop CinemaHub</h2>
            <p className="ch-section-subtitle">
              Sistem backend performa tinggi dirancang untuk keandalan di beban puncak pemesanan tiket.
            </p>
          </div>
        </div>

        <div className="ch-features-grid">
          <div className="ch-feature-card">
            <div className="ch-feature-icon">⚡</div>
            <h3 className="ch-feature-heading">gRPC Ultra-Low Latency</h3>
            <p className="ch-feature-body">
              Komunikasi client-server berbasis Protocol Buffers dengan serialisasi biner berkecepatan tinggi, meminimalkan latensi jaringan hingga di bawah 10ms.
            </p>
          </div>

          <div className="ch-feature-card">
            <div className="ch-feature-icon">🛡️</div>
            <h3 className="ch-feature-heading">Anti Double-Booking</h3>
            <p className="ch-feature-body">
              Diproteksi dengan PostgreSQL Advisory Locks dan Partial Unique Index, mencegah konflik race condition saat puluhan pengguna memesan kursi yang sama secara bersamaan.
            </p>
          </div>

          <div className="ch-feature-card">
            <div className="ch-feature-icon">📡</div>
            <h3 className="ch-feature-heading">Realtime WebSocket Streaming</h3>
            <p className="ch-feature-body">
              Pembaruan status kursi yang dipesan atau dibatalkan disiarkan secara instan ke layar pengunjung tanpa perlu memuat ulang halaman.
            </p>
          </div>
        </div>
      </section>

      {/* Katalog Film: Segera Hadir */}
      <section className="ch-section" style={{ paddingBottom: '60px' }}>
        <div className="ch-section-header">
          <div>
            <h2 className="ch-section-title">Segera Hadir di CinemaHub</h2>
            <p className="ch-section-subtitle">Nantikan deretan film blockbuster musim ini di studio kami.</p>
          </div>
        </div>

        <div className="ch-movies-grid">
          {COMING_SOON_MOVIES.map((movie) => (
            <div key={movie.id} className="ch-movie-card coming-soon-card">
              <div className="ch-poster-wrapper">
                <img src={movie.posterUrl} alt={movie.title} className="ch-poster-img" />
                <span className="ch-badge-date">{movie.releaseDate}</span>
              </div>
              <div className="ch-movie-info">
                <span className="ch-movie-age">{movie.ageRating}</span>
                <h3 className="ch-movie-title">{movie.title}</h3>
                <p className="ch-movie-genre">{movie.genre}</p>
                <button className="ch-btn-card-reminder" disabled>
                  Ingatkan Saya
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

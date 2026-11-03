import React from 'react';
import {
  Star,
  Zap,
  ShieldCheck,
  Radio,
  Clock,
  Calendar,
  ArrowRight,
  Cpu,
  Layers,
  Database,
  RefreshCw,
  Lock,
  GitBranch,
  Terminal,
  Activity
} from 'lucide-react';
import { FEATURED_MOVIE } from '../data/movies';

export default function LandingPage({ onSelectMovie }) {
  return (
    <div className="ch-landing-page">
      {/* 1. HERO SECTION: Single Active Movie */}
      <section className="ch-hero-section">
        <div
          className="ch-hero-backdrop"
          style={{ backgroundImage: `url(${FEATURED_MOVIE.backdropUrl})` }}
        >
          <div className="ch-hero-overlay"></div>
        </div>

        <div className="ch-hero-content">
          <div className="ch-hero-badges">
            <span className="ch-badge-live">SIMULASI AKTIF</span>
            <span className="ch-badge-dim">{FEATURED_MOVIE.auditorium}</span>
            <span className="ch-badge-dim">{FEATURED_MOVIE.ageRating}</span>
          </div>

          <h1 className="ch-hero-title">{FEATURED_MOVIE.title}</h1>
          <p className="ch-hero-tagline">{FEATURED_MOVIE.tagline}</p>
          <p className="ch-hero-description">{FEATURED_MOVIE.description}</p>

          <div className="ch-hero-meta">
            <span className="ch-meta-item">
              <Star size={15} fill="#facc15" color="#facc15" />
              <span>{FEATURED_MOVIE.rating}/10</span>
            </span>
            <span className="ch-dot">•</span>
            <span>{FEATURED_MOVIE.genre}</span>
            <span className="ch-dot">•</span>
            <span className="ch-meta-item">
              <Clock size={14} color="#b3b3b3" />
              <span>{FEATURED_MOVIE.duration}</span>
            </span>
          </div>

          <div className="ch-hero-actions">
            <button
              className="ch-btn-hero-primary"
              onClick={() => onSelectMovie(FEATURED_MOVIE.id)}
            >
              <span>Uji Simulasi & Pesan Tiket</span>
              <ArrowRight size={18} />
            </button>
            <div className="ch-hero-schedule-info">
              <span className="ch-schedule-label">Jadwal Sesi Tersedia:</span>
              <span className="ch-schedule-time">{FEATURED_MOVIE.showTime}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PENJELASAN SIMULASI PROYEK & ARSITEKTUR SISTEM TERDISTRIBUSI */}
      <section className="ch-section">
        <div className="ch-section-header">
          <div>
            <h2 className="ch-section-title">Tentang Simulasi Proyek Ini</h2>
            <p className="ch-section-subtitle">
              Sistem reservasi tiket bioskop terdistribusi dirancang untuk menguji keandalan concurrency control, idempotensi, dan sinkronisasi realtime pada beban pemesanan bersamaan.
            </p>
          </div>
        </div>

        {/* Alur Kerja Sistem (Pipeline / Workflow Visual) */}
        <div className="sim-workflow-card">
          <h3 className="sim-workflow-title">
            <Activity size={18} color="#e50914" />
            <span>Alur Transaksi & Sinkronisasi Kursi (End-to-End)</span>
          </h3>

          <div className="sim-steps-grid">
            <div className="sim-step-item">
              <div className="sim-step-num">1</div>
              <div className="sim-step-badge">Client Tier</div>
              <h4 className="sim-step-heading">Permintaan Kursi</h4>
              <p className="sim-step-desc">
                Pengguna memilih kursi dan mengirim nama pemesan beserta token <code>request_id</code> unik (UUID v4) via Web UI atau terminal CLI.
              </p>
            </div>

            <div className="sim-step-item">
              <div className="sim-step-num">2</div>
              <div className="sim-step-badge">Gateway Tier</div>
              <h4 className="sim-step-heading">FastAPI BFF Gateway</h4>
              <p className="sim-step-desc">
                Menjembatani browser ke backend melalui REST HTTP dan WebSocket, memvalidasi payload sebelum memanggil prosedur gRPC.
              </p>
            </div>

            <div className="sim-step-item">
              <div className="sim-step-num">3</div>
              <div className="sim-step-badge">RPC Tier</div>
              <h4 className="sim-step-heading">gRPC CinemaService</h4>
              <p className="sim-step-desc">
                Server menerima <code>PesanKursi()</code> berbasis Protocol Buffers dengan serialisasi biner super cepat dan thread pool concurrent.
              </p>
            </div>

            <div className="sim-step-item">
              <div className="sim-step-num">4</div>
              <div className="sim-step-badge">Database Tier</div>
              <h4 className="sim-step-heading">PostgreSQL Concurrency</h4>
              <p className="sim-step-desc">
                Mengunci baris kursi dengan <code>SELECT FOR UPDATE</code> dan Advisory Lock, memastikan nol kursi ganda (zero double-booking).
              </p>
            </div>

            <div className="sim-step-item">
              <div className="sim-step-num">5</div>
              <div className="sim-step-badge">Realtime Broadcast</div>
              <h4 className="sim-step-heading">WebSocket Broadcast</h4>
              <p className="sim-step-desc">
                Setelah transaksi di-commit, event disiarkan seketika ke seluruh layar pengguna untuk mengubah warna kursi secara otomatis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FITUR TEKNOLOGI YANG DIUJI DALAM SIMULASI */}
      <section className="ch-section">
        <div className="ch-section-header">
          <div>
            <h2 className="ch-section-title">Fitur Teknis yang Ada di Web Ini</h2>
            <p className="ch-section-subtitle">
              Setiap komponen pada website ini merepresentasikan mekanisme nyata sistem terdistribusi.
            </p>
          </div>
        </div>

        <div className="ch-features-grid">
          {/* Card 1 */}
          <div className="ch-feature-card">
            <div className="ch-feature-icon-wrapper red">
              <Zap size={22} color="#e50914" />
            </div>
            <h3 className="ch-feature-heading">gRPC & Protocol Buffers</h3>
            <p className="ch-feature-body">
              Menggantikan REST tradisional dengan RPC biner berperforma tinggi. Menjamin definisi antarmuka kontrak data yang ketat via file <code>cinema.proto</code>.
            </p>
          </div>

          {/* Card 2 */}
          <div className="ch-feature-card">
            <div className="ch-feature-icon-wrapper blue">
              <ShieldCheck size={22} color="#3b82f6" />
            </div>
            <h3 className="ch-feature-heading">Pencegahan Double-Booking</h3>
            <p className="ch-feature-body">
              Menggunakan <em>Pessimistic Row-Level Locking</em> dan <em>Partial Unique Index</em> pada PostgreSQL. Jika dua orang memesan kursi yang sama di milidetik yang sama, salah satu berhasil dan lainnya menerima error <code>ALREADY_EXISTS</code>.
            </p>
          </div>

          {/* Card 3 */}
          <div className="ch-feature-card">
            <div className="ch-feature-icon-wrapper green">
              <Radio size={22} color="#10b981" />
            </div>
            <h3 className="ch-feature-heading">Live Stream Status Kursi</h3>
            <p className="ch-feature-body">
              Menggunakan Server Streaming gRPC yang diteruskan ke WebSocket browser. Pengunjung langsung melihat kursi terisi tanpa perlu menekan tombol refresh.
            </p>
          </div>

          {/* Card 4 */}
          <div className="ch-feature-card">
            <div className="ch-feature-icon-wrapper amber">
              <RefreshCw size={22} color="#f59e0b" />
            </div>
            <h3 className="ch-feature-heading">Idempotensi Transaksi</h3>
            <p className="ch-feature-body">
              Setiap pemesanan memiliki <code>request_id</code> unik dan verifikasi hash payload. Jika koneksi terputus dan client melakukan auto-retry, transaksi tidak akan menduplikasi pemesanan tiket.
            </p>
          </div>

          {/* Card 5 */}
          <div className="ch-feature-card">
            <div className="ch-feature-icon-wrapper purple">
              <Layers size={22} color="#a855f7" />
            </div>
            <h3 className="ch-feature-heading">Panel Admin & Transparansi</h3>
            <p className="ch-feature-body">
              Tersedia dashboard audit untuk melihat daftar pemilik kursi yang terkonfirmasi, histori pembatalan transaksi, serta hak akses untuk menghapus/mereset kursi demo.
            </p>
          </div>

          {/* Card 6 */}
          <div className="ch-feature-card">
            <div className="ch-feature-icon-wrapper cyan">
              <Terminal size={22} color="#06b6d4" />
            </div>
            <h3 className="ch-feature-heading">Dukungan CLI & Race Test</h3>
            <p className="ch-feature-body">
              Selain melalui web, sistem dapat diuji langsung via terminal menggunakan container client (misal: <code>docker compose run client race-test</code>) yang langsung tersinkronisasi ke web.
            </p>
          </div>
        </div>
      </section>

      {/* 4. CALL TO ACTION SECTION */}
      <section className="ch-section" style={{ paddingBottom: '60px' }}>
        <div className="sim-cta-box">
          <div className="sim-cta-content">
            <h3 className="sim-cta-title">Siap Mencoba Simulasi Pemesanan?</h3>
            <p className="sim-cta-desc">
              Pilih kursi di Studio 1 Ultra IMAX, lakukan pemesanan, atau buka tab Admin untuk melihat transparansi data transaksi di database PostgreSQL.
            </p>
          </div>
          <button
            className="ch-btn-hero-primary"
            onClick={() => onSelectMovie(FEATURED_MOVIE.id)}
          >
            <span>Buka Layar Pemesanan Kursi</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}

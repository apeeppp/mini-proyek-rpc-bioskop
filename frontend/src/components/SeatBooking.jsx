import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ticket,
  User,
  ShieldCheck,
  Radio,
  History,
  Trash2,
  RefreshCw,
  Search,
  CheckSquare,
  Square
} from 'lucide-react';
import { FEATURED_MOVIE } from '../data/movies';

const SHOW_ID = 'SHOW-001';
const ROWS = ['A', 'B', 'C', 'D'];

export default function SeatBooking({ onBackToHome, isWsConnected }) {
  // Mode Tab: 'booking' (Penonton) | 'admin' (Admin & Transparansi Log)
  const [activeTab, setActiveTab] = useState('booking');

  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]); // Array multi-kursi
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [activities, setActivities] = useState([]);

  // Database Bookings List (untuk Admin & Transparansi)
  const [allBookings, setAllBookings] = useState([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [userBookings, setUserBookings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cinema_user_bookings') || '[]');
    } catch {
      return [];
    }
  });

  const wsRef = useRef(null);
  const selectedSeatsRef = useRef(selectedSeats);
  const pendingBookingSeatsRef = useRef(new Set());

  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  // Simpan booking lokal pengguna
  useEffect(() => {
    localStorage.setItem('cinema_user_bookings', JSON.stringify(userBookings));
  }, [userBookings]);

  // Sinkronkan status tiket sesi ini dengan data terbaru dari database
  useEffect(() => {
    if (allBookings.length > 0 && userBookings.length > 0) {
      setUserBookings((prev) => {
        let changed = false;
        const updated = prev.filter((myTicket) => {
          // Cari status terkini di database
          const found = allBookings.find((b) => b.booking_id === myTicket.booking_id);
          // Jika sudah berstatus CANCELLED di database atau sudah tidak ada, hapus dari tiket aktif
          if (found && found.status === 'CANCELLED') {
            changed = true;
            return false;
          }
          return true;
        });
        return changed ? updated : prev;
      });
    }
  }, [allBookings]);

  // Ambil daftar status kursi terkini
  const fetchSeats = async () => {
    try {
      const res = await fetch(`/api/shows/${SHOW_ID}/seats`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.seats) && data.seats.length > 0) {
          setSeats(data.seats);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil daftar kursi:', err);
    }
  };

  // Ambil daftar seluruh booking dari database (untuk Admin & Log)
  const fetchAllBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await fetch(`/api/shows/${SHOW_ID}/bookings`);
      if (res.ok) {
        const data = await res.json();
        setAllBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('Gagal mengambil data riwayat booking:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchSeats();
    fetchAllBookings();
  }, []);

  // WebSocket connection untuk status realtime
  useEffect(() => {
    let reconnectTimeout;
    let isMounted = true;

    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/shows/${SHOW_ID}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);

          if (data.event === 'SNAPSHOT' || data.event === 'BOOKED' || data.event === 'CANCELLED') {
            setSeats((prev) => {
              const idx = prev.findIndex((s) => s.seat_no === data.seat_no);
              const updatedItem = {
                seat_no: data.seat_no,
                status: data.status,
                customer_name: data.customer_name || '',
                booking_id: data.booking_id || ''
              };

              if (idx >= 0) {
                const nextSeats = [...prev];
                nextSeats[idx] = updatedItem;
                return nextSeats;
              }
              return [...prev, updatedItem].sort((a, b) => a.seat_no.localeCompare(b.seat_no));
            });
          }

          if (data.event === 'BOOKED' || data.event === 'CANCELLED') {
            // Perbarui juga data tabel admin secara otomatis
            fetchAllBookings();

            // Jika kursi dibatalkan oleh admin/server, hapus dari daftar tiket lokal pengguna
            if (data.event === 'CANCELLED') {
              setUserBookings((prev) => prev.filter((b) => b.seat_no !== data.seat_no));
            }

            // Jika kursi yang sedang dipilih dibooking orang lain (bukan bagian dari submit user ini sendiri),
            // hilangkan dari selectedSeats dan beri notifikasi peringatan.
            if (data.event === 'BOOKED') {
              const isOwnPendingSeat = pendingBookingSeatsRef.current.has(data.seat_no);
              if (selectedSeatsRef.current.includes(data.seat_no) && !isOwnPendingSeat) {
                setSelectedSeats((prev) => prev.filter((s) => s !== data.seat_no));
                setStatusMsg({
                  type: 'error',
                  text: `Kursi ${data.seat_no} baru saja dipesan oleh pengunjung lain dan dihapus dari pilihan Anda.`
                });
              }
            }

            // Catat log aktivitas
            setActivities((prev) => [
              {
                id: Date.now() + Math.random(),
                text:
                  data.event === 'BOOKED'
                    ? `Kursi ${data.seat_no} berhasil dipesan${data.customer_name ? ` oleh ${data.customer_name}` : ''}`
                    : `Pemesanan kursi ${data.seat_no} dibatalkan`,
                time: new Date().toLocaleTimeString(),
                type: data.event.toLowerCase(),
                seat_no: data.seat_no
              },
              ...prev.slice(0, 20)
            ]);
          }
        } catch (err) {
          console.error('Error parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        fetchSeats();
        reconnectTimeout = setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWs();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Toggle seleksi kursi (mendukung lebih dari 1 kursi)
  const toggleSeatSelection = (seatNo) => {
    setSelectedSeats((prev) => {
      if (prev.includes(seatNo)) {
        return prev.filter((s) => s !== seatNo);
      } else {
        return [...prev, seatNo].sort((a, b) => a.localeCompare(b));
      }
    });
  };

  // Handle pemesanan (Single atau Multi-kursi)
  const handleBooking = async (e) => {
    e.preventDefault();
    if (selectedSeats.length === 0 || !customerName.trim()) return;

    const seatsToBook = [...selectedSeats];
    seatsToBook.forEach((s) => pendingBookingSeatsRef.current.add(s));

    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          show_id: SHOW_ID,
          seat_nos: seatsToBook,
          customer_name: customerName.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Pemesanan gagal');
      }

      // Ambil daftar booking yang berhasil dibuat
      const newBookings = data.bookings || [data];
      const createdTickets = newBookings.map((b) => ({
        booking_id: b.booking_id,
        seat_no: b.seat_no,
        customer_name: b.customer_name,
        time: new Date().toLocaleTimeString()
      }));

      setStatusMsg({
        type: 'success',
        text: `Berhasil memesan ${createdTickets.length} tiket kursi: ${createdTickets.map((t) => t.seat_no).join(', ')}!`
      });

      setUserBookings((prev) => {
        // Gabungkan dan hindari duplikasi jika ada ID yang sama
        const existingIds = new Set(prev.map((b) => b.booking_id));
        const filteredNew = createdTickets.filter((b) => !existingIds.has(b.booking_id));
        return [...filteredNew, ...prev];
      });
      setSelectedSeats([]);
      setCustomerName('');
      fetchAllBookings();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      seatsToBook.forEach((s) => pendingBookingSeatsRef.current.delete(s));
      setLoading(false);
    }
  };

  // Handle pembatalan (user atau admin)
  const handleCancelBooking = async (bookingId, seatNo, isAdmin = false) => {
    const confirmationMsg = isAdmin
      ? `[ADMIN ACTION] Batalkan reservasi kursi ${seatNo}? Status akan kembali menjadi AVAILABLE.`
      : `Batalkan pemesanan kursi ${seatNo}?`;

    if (!confirm(confirmationMsg)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Gagal membatalkan pemesanan');

      setUserBookings((prev) => prev.filter((b) => b.booking_id !== bookingId));
      setStatusMsg({
        type: 'success',
        text: `Pemesanan kursi ${seatNo} berhasil dibatalkan${isAdmin ? ' oleh Admin.' : '.'}`
      });
      fetchAllBookings();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Filter daftar booking untuk tabel admin
  const filteredBookings = allBookings.filter((b) => {
    if (!adminSearch) return true;
    const q = adminSearch.toLowerCase();
    return (
      b.seat_no.toLowerCase().includes(q) ||
      b.customer_name.toLowerCase().includes(q) ||
      b.status.toLowerCase().includes(q) ||
      b.booking_id.toLowerCase().includes(q)
    );
  });

  const totalSeatsCount = seats.length || 32;
  const confirmedCount = allBookings.filter((b) => b.status === 'CONFIRMED').length;
  const cancelledCount = allBookings.filter((b) => b.status === 'CANCELLED').length;

  return (
    <div className="bk-wrapper">
      {/* Top Banner & Header */}
      <div className="bk-top-banner">
        <div className="bk-top-nav">
          <button className="bk-btn-back" onClick={onBackToHome}>
            <ArrowLeft size={16} />
            <span>Kembali ke Beranda</span>
          </button>

          {/* Mode Switcher Tabs */}
          <div className="bk-tab-switcher">
            <button
              type="button"
              className={`bk-tab-btn ${activeTab === 'booking' ? 'active' : ''}`}
              onClick={() => setActiveTab('booking')}
            >
              <Ticket size={15} />
              <span>Pemesanan Kursi</span>
            </button>
            <button
              type="button"
              className={`bk-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('admin');
                fetchAllBookings();
              }}
            >
              <ShieldCheck size={15} />
              <span>Admin & Transparansi Log</span>
              {confirmedCount > 0 && <span className="bk-tab-counter">{confirmedCount}</span>}
            </button>
          </div>

          <div className="bk-connection-status">
            <span className={`bk-status-dot ${isWsConnected ? 'connected' : 'disconnected'}`}></span>
            <span>{isWsConnected ? 'Live gRPC Stream' : 'Menghubungkan...'}</span>
          </div>
        </div>

        {/* Sinopsis & Info Film Siksa Kubur */}
        <div className="bk-movie-header-card">
          <div className="bk-movie-poster-thumb">
            <img src={FEATURED_MOVIE.posterUrl} alt={FEATURED_MOVIE.title} />
          </div>
          <div className="bk-movie-details">
            <div className="bk-movie-badges">
              <span className="bk-badge-red">SIMULASI AKTIF</span>
              <span className="bk-badge-dim">{FEATURED_MOVIE.ageRating}</span>
              <span className="bk-badge-dim">{FEATURED_MOVIE.auditorium}</span>
            </div>
            <h1 className="bk-movie-title">{FEATURED_MOVIE.title}</h1>
            <p className="bk-movie-genre">{FEATURED_MOVIE.genre}</p>
            <div className="bk-movie-meta-bar">
              <span className="bk-meta-item">
                <Clock size={14} color="#b3b3b3" />
                <span>{FEATURED_MOVIE.duration}</span>
              </span>
              <span className="bk-meta-dot">•</span>
              <span className="bk-meta-item">
                <Calendar size={14} color="#b3b3b3" />
                <span>{FEATURED_MOVIE.showTime}</span>
              </span>
              <span className="bk-meta-dot">•</span>
              <span className="bk-meta-item">
                <ShieldCheck size={14} color="#3b82f6" />
                <span>Show ID: {SHOW_ID}</span>
              </span>
              <span className="bk-meta-dot">•</span>
              <span className="bk-meta-item" style={{ color: '#22c55e' }}>
                <span>Kursi Terisi: {confirmedCount} / {totalSeatsCount}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: MODE PEMESANAN KURSI (User View) */}
      {activeTab === 'booking' && (
        <div className="bk-main-grid">
          {/* Cinema Theater Room (Screen & Seats: 16 Kiri - Lorong - 16 Kanan) */}
          <section className="bk-theater-section">
            <div className="bk-screen-container">
              <div className="bk-projector-light"></div>
              <div className="bk-screen-curve"></div>
              <div className="bk-screen-caption">LAYAR BIOSKOP / SCREEN</div>
            </div>

            {/* Layout Teater Bioskop: 32 Kursi (4 Baris A, B, C, D) */}
            <div className="bk-theater-layout">
              {/* Header Blok Kiri & Kanan */}
              <div className="bk-layout-header">
                <span className="bk-block-title">BLOK KIRI (16 Kursi)</span>
                <span className="bk-aisle-header">LORONG TENGAH</span>
                <span className="bk-block-title">BLOK KANAN (16 Kursi)</span>
              </div>

              <div className="bk-seat-map-32">
                {ROWS.map((rowLabel) => {
                  // Ambil kursi baris ini
                  const rowSeats = seats.filter((s) => s.seat_no.startsWith(rowLabel));
                  // Sisi Kiri: nomor 1 s/d 4 (4 kursi)
                  const leftSeats = [1, 2, 3, 4].map((num) => {
                    const seatId = `${rowLabel}${num}`;
                    return rowSeats.find((s) => s.seat_no === seatId) || { seat_no: seatId, status: 'AVAILABLE' };
                  });
                  // Sisi Kanan: nomor 5 s/d 8 (4 kursi)
                  const rightSeats = [5, 6, 7, 8].map((num) => {
                    const seatId = `${rowLabel}${num}`;
                    return rowSeats.find((s) => s.seat_no === seatId) || { seat_no: seatId, status: 'AVAILABLE' };
                  });

                  return (
                    <div key={rowLabel} className="bk-row-split">
                      {/* Label Baris Kiri */}
                      <span className="bk-row-label">{rowLabel}</span>

                      {/* Blok Kiri (4 Kursi) */}
                      <div className="bk-seat-cluster left">
                        {leftSeats.map((seat) => {
                          const isBooked = seat.status === 'BOOKED';
                          const isSelected = selectedSeats.includes(seat.seat_no);

                          let seatClass = 'available';
                          if (isBooked) seatClass = 'booked';
                          else if (isSelected) seatClass = 'selected';

                          return (
                            <button
                              key={seat.seat_no}
                              type="button"
                              disabled={isBooked}
                              className={`bk-seat-btn ${seatClass}`}
                              onClick={() => toggleSeatSelection(seat.seat_no)}
                              title={
                                isBooked
                                  ? `Kursi ${seat.seat_no} terisi (${seat.customer_name || 'Terkonfirmasi'})`
                                  : `Klik untuk memilih/membatalkan kursi ${seat.seat_no}`
                              }
                            >
                              <div className="bk-seat-head"></div>
                              <div className="bk-seat-base">{seat.seat_no}</div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Lorong Tengah Bioskop (Center Walkway / Aisle) */}
                      <div className="bk-center-aisle">
                        <span className="bk-aisle-line"></span>
                      </div>

                      {/* Blok Kanan (4 Kursi) */}
                      <div className="bk-seat-cluster right">
                        {rightSeats.map((seat) => {
                          const isBooked = seat.status === 'BOOKED';
                          const isSelected = selectedSeats.includes(seat.seat_no);

                          let seatClass = 'available';
                          if (isBooked) seatClass = 'booked';
                          else if (isSelected) seatClass = 'selected';

                          return (
                            <button
                              key={seat.seat_no}
                              type="button"
                              disabled={isBooked}
                              className={`bk-seat-btn ${seatClass}`}
                              onClick={() => toggleSeatSelection(seat.seat_no)}
                              title={
                                isBooked
                                  ? `Kursi ${seat.seat_no} terisi (${seat.customer_name || 'Terkonfirmasi'})`
                                  : `Klik untuk memilih/membatalkan kursi ${seat.seat_no}`
                              }
                            >
                              <div className="bk-seat-head"></div>
                              <div className="bk-seat-base">{seat.seat_no}</div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Label Baris Kanan */}
                      <span className="bk-row-label">{rowLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legenda Kursi */}
            <div className="bk-legend">
              <div className="bk-legend-item">
                <div className="bk-legend-chip available"></div>
                <span>Tersedia (Bisa Pilih Banyak)</span>
              </div>
              <div className="bk-legend-item">
                <div className="bk-legend-chip selected"></div>
                <span>Pilihan Anda ({selectedSeats.length} Kursi)</span>
              </div>
              <div className="bk-legend-item">
                <div className="bk-legend-chip booked"></div>
                <span>Terisi (Booked)</span>
              </div>
            </div>
          </section>

          {/* Sidebar Form & Tiket Sesi */}
          <aside className="bk-sidebar">
            <div className="bk-panel-card">
              <div className="bk-panel-header">
                <Ticket size={18} color="#e50914" />
                <h2 className="bk-panel-title">Form Reservasi Tiket</h2>
              </div>

              {statusMsg && (
                <div className={`bk-alert ${statusMsg.type === 'error' ? 'error' : 'success'}`}>
                  {statusMsg.type === 'error' ? (
                    <AlertCircle size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleBooking} className="bk-form">
                <div className="bk-form-field">
                  <div className="bk-label-row">
                    <label className="bk-label">Kursi yang Dipilih</label>
                    {selectedSeats.length > 0 && (
                      <span className="bk-multi-badge">{selectedSeats.length} Kursi Terpilih</span>
                    )}
                  </div>

                  <div className={`bk-seat-display ${selectedSeats.length > 0 ? 'active' : 'empty'}`}>
                    {selectedSeats.length > 0 ? (
                      <div className="bk-chips-container">
                        {selectedSeats.map((s) => (
                          <span
                            key={s}
                            className="bk-seat-tag-interactive"
                            onClick={() => toggleSeatSelection(s)}
                            title="Klik untuk menghapus kursi ini"
                          >
                            {s} &times;
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="bk-seat-placeholder">
                        Klik beberapa kursi sekaligus di denah (bisa &gt; 1 kursi)
                      </span>
                    )}
                  </div>
                </div>

                <div className="bk-form-field">
                  <label className="bk-label" htmlFor="customer-name-input">
                    Nama Pemesan / Kontak
                  </label>
                  <div className="bk-input-wrapper">
                    <User size={16} className="bk-input-icon" />
                    <input
                      id="customer-name-input"
                      type="text"
                      required
                      placeholder="Contoh: Budi Santoso & Rombongan"
                      className="bk-input"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      disabled={selectedSeats.length === 0 || loading}
                    />
                  </div>
                </div>

                {selectedSeats.length > 1 && (
                  <div className="bk-batch-summary">
                    <span>Estimasi Tiket:</span>
                    <strong>{selectedSeats.length} Tiket Bioskop</strong>
                  </div>
                )}

                <button
                  type="submit"
                  className="bk-btn-submit"
                  disabled={selectedSeats.length === 0 || !customerName.trim() || loading}
                >
                  {loading
                    ? 'Memproses Pemesanan...'
                    : selectedSeats.length > 1
                    ? `Pesan ${selectedSeats.length} Kursi Sekaligus`
                    : 'Konfirmasi & Pesan Tiket'}
                </button>
              </form>
            </div>

            {/* Sesi Tiket Saya */}
            {userBookings.length > 0 && (
              <div className="bk-panel-card">
                <div className="bk-panel-header">
                  <Ticket size={18} color="#facc15" />
                  <h2 className="bk-panel-title">Tiket Anda Sesi Ini ({userBookings.length})</h2>
                </div>

                <div className="bk-ticket-list">
                  {userBookings.map((b) => (
                    <div key={b.booking_id} className="bk-ticket-pass">
                      <div className="bk-ticket-body">
                        <div className="bk-ticket-col-seat">
                          <span className="bk-ticket-lbl">KURSI</span>
                          <span className="bk-ticket-val-seat">{b.seat_no}</span>
                        </div>
                        <div className="bk-ticket-col-info">
                          <span className="bk-ticket-title">Siksa Kubur</span>
                          <span className="bk-ticket-user">{b.customer_name}</span>
                          <span className="bk-ticket-time">{b.time}</span>
                        </div>
                      </div>
                      <div className="bk-ticket-actions">
                        <button
                          type="button"
                          className="bk-btn-cancel-ticket"
                          onClick={() => handleCancelBooking(b.booking_id, b.seat_no, false)}
                          disabled={loading}
                        >
                          Batalkan Tiket
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Activity Feed */}
            <div className="bk-panel-card">
              <div className="bk-panel-header">
                <Radio size={16} color="#10b981" />
                <h2 className="bk-panel-title">Aktivitas Realtime</h2>
              </div>

              <div className="bk-activity-feed">
                {activities.length === 0 ? (
                  <div className="bk-activity-empty">
                    Menunggu aktivitas pemesanan kursi dari simulasi...
                  </div>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className={`bk-activity-item ${act.type}`}>
                      <div className="bk-activity-icon">
                        {act.type === 'booked' ? (
                          <CheckCircle2 size={14} color="#ef4444" />
                        ) : (
                          <XCircle size={14} color="#10b981" />
                        )}
                      </div>
                      <div className="bk-activity-content">
                        <p className="bk-activity-text">{act.text}</p>
                        <span className="bk-activity-time">{act.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* VIEW 2: MODE ADMIN & TRANSPARANSI LOG DATABASE */}
      {activeTab === 'admin' && (
        <div className="admin-view-container">
          {/* Summary Metric Cards */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-label">Total Kapasitas Studio</span>
              <span className="admin-stat-value">{totalSeatsCount}</span>
              <span className="admin-stat-sub">16 Kursi Kiri & 16 Kursi Kanan (A-D)</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Kursi Terisi (CONFIRMED)</span>
              <span className="admin-stat-value red">{confirmedCount}</span>
              <span className="admin-stat-sub">Terkunci di Database</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Kursi Tersedia (AVAILABLE)</span>
              <span className="admin-stat-value green">{totalSeatsCount - confirmedCount}</span>
              <span className="admin-stat-sub">Siap Dipesan Pengunjung</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Riwayat Pembatalan</span>
              <span className="admin-stat-value yellow">{cancelledCount}</span>
              <span className="admin-stat-sub">Transaksi Di-Cancel</span>
            </div>
          </div>

          {/* Toolbar & Filter */}
          <div className="admin-toolbar">
            <div className="admin-search-wrapper">
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                placeholder="Cari nomor kursi (misal: C2), nama pemesan, atau status..."
                className="admin-search-input"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
              />
            </div>

            <div className="admin-actions-bar">
              <button
                type="button"
                className="admin-btn-refresh"
                onClick={() => {
                  fetchSeats();
                  fetchAllBookings();
                }}
                disabled={loadingBookings}
              >
                <RefreshCw size={14} className={loadingBookings ? 'spinning' : ''} />
                <span>Sinkronkan Data</span>
              </button>
            </div>
          </div>

          {/* Tabel Transparansi Log Booking */}
          <div className="admin-table-card">
            <div className="admin-table-header-title">
              <div className="admin-table-icon">
                <History size={18} color="#e50914" />
              </div>
              <div>
                <h3 className="admin-table-heading">Log Histori Transaksi Database (PostgreSQL)</h3>
                <p className="admin-table-sub">
                  Daftar transaksi aktual yang tersimpan di tabel <code>bookings</code>. Admin memiliki otorisasi untuk menghapus atau membatalkan pesanan.
                </p>
              </div>
            </div>

            {loadingBookings ? (
              <div className="admin-loading-state">Memuat data dari database PostgreSQL...</div>
            ) : filteredBookings.length === 0 ? (
              <div className="admin-empty-state">
                Tidak ada data pemesanan yang cocok dengan kriteria pencarian.
              </div>
            ) : (
              <div className="admin-table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>NO KURSI</th>
                      <th>ATAS NAMA PEMESAN</th>
                      <th>STATUS STATUS</th>
                      <th>WAKTU PEMESANAN</th>
                      <th>BOOKING ID (UUID)</th>
                      <th>AKSI ADMIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => {
                      const isConfirmed = b.status === 'CONFIRMED';
                      return (
                        <tr key={b.booking_id} className={isConfirmed ? 'row-confirmed' : 'row-cancelled'}>
                          <td>
                            <span className={`admin-seat-chip ${isConfirmed ? 'confirmed' : 'cancelled'}`}>
                              Kursi {b.seat_no}
                            </span>
                          </td>
                          <td>
                            <div className="admin-user-cell">
                              <User size={14} color={isConfirmed ? '#ffffff' : '#808080'} />
                              <span className="admin-user-name">{b.customer_name}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`admin-badge-status ${b.status.toLowerCase()}`}>
                              {b.status === 'CONFIRMED' ? (
                                <>
                                  <CheckCircle2 size={12} />
                                  <span>TERKONFIRMASI</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={12} />
                                  <span>DIBATALKAN</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="admin-cell-time">
                            {b.created_at ? new Date(b.created_at).toLocaleString('id-ID') : '-'}
                          </td>
                          <td className="admin-cell-uuid">
                            <code>{b.booking_id.substring(0, 8)}...{b.booking_id.substring(b.booking_id.length - 4)}</code>
                          </td>
                          <td>
                            {isConfirmed ? (
                              <button
                                type="button"
                                className="admin-btn-delete"
                                onClick={() => handleCancelBooking(b.booking_id, b.seat_no, true)}
                                disabled={loading}
                                title="Batalkan reservasi kursi ini dan ubah status menjadi AVAILABLE kembali"
                              >
                                <Trash2 size={13} />
                                <span>Hapus / Kosongkan</span>
                              </button>
                            ) : (
                              <span className="admin-btn-disabled">Sudah Dibatalkan</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

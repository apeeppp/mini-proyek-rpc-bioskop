import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Film,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ticket,
  User,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { FEATURED_MOVIE } from '../data/movies';

const SHOW_ID = 'SHOW-001';

export default function SeatBooking({ onBackToHome, isWsConnected }) {
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [activities, setActivities] = useState([]);
  const [userBookings, setUserBookings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cinema_user_bookings') || '[]');
    } catch {
      return [];
    }
  });

  const wsRef = useRef(null);
  const selectedSeatRef = useRef(selectedSeat);

  useEffect(() => {
    selectedSeatRef.current = selectedSeat;
  }, [selectedSeat]);

  // Simpan booking lokal pengguna
  useEffect(() => {
    localStorage.setItem('cinema_user_bookings', JSON.stringify(userBookings));
  }, [userBookings]);

  // Load awal via REST API
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

  useEffect(() => {
    fetchSeats();
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
            // Jika kursi yang sedang dipilih dibooking orang lain
            if (data.event === 'BOOKED' && selectedSeatRef.current === data.seat_no) {
              setSelectedSeat(null);
              setStatusMsg({
                type: 'error',
                text: `Kursi ${data.seat_no} baru saja dipesan oleh pengunjung lain.`
              });
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
              ...prev.slice(0, 15)
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

  // Handle pemesanan
  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedSeat || !customerName.trim()) return;

    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          show_id: SHOW_ID,
          seat_no: selectedSeat,
          customer_name: customerName.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Pemesanan gagal');
      }

      setStatusMsg({ type: 'success', text: `Tiket kursi ${selectedSeat} berhasil dipesan!` });
      setUserBookings((prev) => [
        {
          booking_id: data.booking_id,
          seat_no: data.seat_no,
          customer_name: data.customer_name,
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ]);
      setSelectedSeat(null);
      setCustomerName('');
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Handle pembatalan
  const handleCancel = async (bookingId, seatNo) => {
    if (!confirm(`Batalkan pemesanan kursi ${seatNo}?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Gagal membatalkan pemesanan');

      setUserBookings((prev) => prev.filter((b) => b.booking_id !== bookingId));
      setStatusMsg({ type: 'success', text: `Pemesanan kursi ${seatNo} berhasil dibatalkan.` });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const rowA = seats.filter((s) => s.seat_no.startsWith('A'));
  const rowB = seats.filter((s) => s.seat_no.startsWith('B'));

  return (
    <div className="bk-wrapper">
      {/* Top Breadcrumb & Movie Header Banner */}
      <div className="bk-top-banner">
        <div className="bk-top-nav">
          <button className="bk-btn-back" onClick={onBackToHome}>
            <ArrowLeft size={16} />
            <span>Kembali ke Katalog Film</span>
          </button>

          <div className="bk-connection-status">
            <span className={`bk-status-dot ${isWsConnected ? 'connected' : 'disconnected'}`}></span>
            <span>{isWsConnected ? 'Live Seat Stream' : 'Menghubungkan...'}</span>
          </div>
        </div>

        {/* Sinopsis & Detail Ringkas Film */}
        <div className="bk-movie-header-card">
          <div className="bk-movie-poster-thumb">
            <img src={FEATURED_MOVIE.posterUrl} alt={FEATURED_MOVIE.title} />
          </div>
          <div className="bk-movie-details">
            <div className="bk-movie-badges">
              <span className="bk-badge-red">SEDANG TAYANG</span>
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
                <span>ID: {SHOW_ID}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Reservation Grid */}
      <div className="bk-main-grid">
        {/* Cinema Theater Room (Screen & Seats) */}
        <section className="bk-theater-section">
          {/* Cinema Curved Screen */}
          <div className="bk-screen-container">
            <div className="bk-projector-light"></div>
            <div className="bk-screen-curve"></div>
            <div className="bk-screen-caption">LAYAR BIOSKOP / SCREEN</div>
          </div>

          {/* Seat Layout (Opsi B: Available = Slate/Charcoal, Selected = Amber/Kuning, Booked = Merah) */}
          <div className="bk-seat-map">
            {/* Baris A */}
            <div className="bk-row">
              <span className="bk-row-label">A</span>
              <div className="bk-row-seats">
                {rowA.map((seat) => {
                  const isBooked = seat.status === 'BOOKED';
                  const isSelected = selectedSeat === seat.seat_no;

                  let seatClass = 'available';
                  if (isBooked) seatClass = 'booked';
                  else if (isSelected) seatClass = 'selected';

                  return (
                    <button
                      key={seat.seat_no}
                      type="button"
                      disabled={isBooked}
                      className={`bk-seat-btn ${seatClass}`}
                      onClick={() => setSelectedSeat(isSelected ? null : seat.seat_no)}
                      title={
                        isBooked
                          ? `Kursi ${seat.seat_no} telah dipesan oleh: ${seat.customer_name || 'Terkonfirmasi'}`
                          : `Klik untuk memilih kursi ${seat.seat_no}`
                      }
                    >
                      <div className="bk-seat-head"></div>
                      <div className="bk-seat-base">{seat.seat_no}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Baris B */}
            <div className="bk-row">
              <span className="bk-row-label">B</span>
              <div className="bk-row-seats">
                {rowB.map((seat) => {
                  const isBooked = seat.status === 'BOOKED';
                  const isSelected = selectedSeat === seat.seat_no;

                  let seatClass = 'available';
                  if (isBooked) seatClass = 'booked';
                  else if (isSelected) seatClass = 'selected';

                  return (
                    <button
                      key={seat.seat_no}
                      type="button"
                      disabled={isBooked}
                      className={`bk-seat-btn ${seatClass}`}
                      onClick={() => setSelectedSeat(isSelected ? null : seat.seat_no)}
                      title={
                        isBooked
                          ? `Kursi ${seat.seat_no} telah dipesan oleh: ${seat.customer_name || 'Terkonfirmasi'}`
                          : `Klik untuk memilih kursi ${seat.seat_no}`
                      }
                    >
                      <div className="bk-seat-head"></div>
                      <div className="bk-seat-base">{seat.seat_no}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Seat Legend (Opsi B) */}
          <div className="bk-legend">
            <div className="bk-legend-item">
              <div className="bk-legend-chip available"></div>
              <span>Tersedia</span>
            </div>
            <div className="bk-legend-item">
              <div className="bk-legend-chip selected"></div>
              <span>Pilihan Anda (Opsi B)</span>
            </div>
            <div className="bk-legend-item">
              <div className="bk-legend-chip booked"></div>
              <span>Terisi (Booked)</span>
            </div>
          </div>
        </section>

        {/* Sidebar Panel: Form & Tiket Sesi */}
        <aside className="bk-sidebar">
          {/* Form Pemesanan */}
          <div className="bk-panel-card">
            <div className="bk-panel-header">
              <Ticket size={18} color="#e50914" />
              <h2 className="bk-panel-title">Form Reservasi Kursi</h2>
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
                <label className="bk-label">Kursi yang Dipilih</label>
                <div className={`bk-seat-display ${selectedSeat ? 'active' : 'empty'}`}>
                  {selectedSeat ? (
                    <>
                      <span className="bk-seat-tag">Nomor Kursi</span>
                      <span className="bk-seat-number">{selectedSeat}</span>
                    </>
                  ) : (
                    <span className="bk-seat-placeholder">Klik salah satu kursi di denah</span>
                  )}
                </div>
              </div>

              <div className="bk-form-field">
                <label className="bk-label" htmlFor="customer-name-input">
                  Nama Pemesan
                </label>
                <div className="bk-input-wrapper">
                  <User size={16} className="bk-input-icon" />
                  <input
                    id="customer-name-input"
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    className="bk-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={!selectedSeat || loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bk-btn-submit"
                disabled={!selectedSeat || !customerName.trim() || loading}
              >
                {loading ? 'Memproses Transaksi...' : 'Konfirmasi & Pesan Tiket'}
              </button>
            </form>
          </div>

          {/* Sesi Tiket Saya (Cinema Pass Style) */}
          {userBookings.length > 0 && (
            <div className="bk-panel-card">
              <div className="bk-panel-header">
                <Ticket size={18} color="#facc15" />
                <h2 className="bk-panel-title">Tiket Anda Sesi Ini</h2>
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
                        onClick={() => handleCancel(b.booking_id, b.seat_no)}
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

          {/* Live Activity Stream (Audit Feed) */}
          <div className="bk-panel-card">
            <div className="bk-panel-header">
              <Radio size={16} color="#10b981" />
              <h2 className="bk-panel-title">Aktivitas Realtime</h2>
            </div>

            <div className="bk-activity-feed">
              {activities.length === 0 ? (
                <div className="bk-activity-empty">
                  Menunggu perubahan kursi dari pengguna lain...
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
    </div>
  );
}

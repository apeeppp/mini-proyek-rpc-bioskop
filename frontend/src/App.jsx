import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const SHOW_ID = 'SHOW-001';

export default function App() {
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [isWsConnected, setIsWsConnected] = useState(false);
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
        setSeats(data.seats || []);
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

      ws.onopen = () => {
        if (!isMounted) return;
        setIsWsConnected(true);
      };

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
              setStatusMsg({ type: 'error', text: `Kursi ${data.seat_no} baru saja dipesan oleh orang lain.` });
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
                type: data.event.toLowerCase()
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
        setIsWsConnected(false);
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

      setStatusMsg({ type: 'success', text: `Berhasil memesan kursi ${selectedSeat}!` });
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

  // Pengelompokan baris A dan B
  const rowA = seats.filter((s) => s.seat_no.startsWith('A'));
  const rowB = seats.filter((s) => s.seat_no.startsWith('B'));

  return (
    <div className="app-container">
      {/* Header */}
      <header>
        <div className="logo-area">
          <div className="logo-badge">CINEMA RPC</div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Sistem Tiket Bioskop</h1>
            <p className="title-tagline">Studio 1 &bull; Jadwal: SHOW-001</p>
          </div>
        </div>

        <div className="status-badge">
          <span className={`status-dot ${isWsConnected ? 'dot-connected' : 'dot-disconnected'}`}></span>
          <span>{isWsConnected ? 'Live Realtime' : 'Reconnecting...'}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="dashboard-grid">
        {/* Cinema Room Layout */}
        <section className="cinema-room">
          <div className="screen-container">
            <div className="screen-curve"></div>
            <div className="screen-label">LAYAR BIOSKOP</div>
          </div>

          <div className="seats-wrapper">
            {/* Baris A */}
            <div className="seat-row">
              <span className="row-label">A</span>
              <div className="seat-cluster">
                {rowA.map((seat) => {
                  const isBooked = seat.status === 'BOOKED';
                  const isSelected = selectedSeat === seat.seat_no;
                  return (
                    <button
                      key={seat.seat_no}
                      className={`seat-button ${isBooked ? 'booked' : ''} ${isSelected ? 'selected' : ''}`}
                      disabled={isBooked}
                      onClick={() => setSelectedSeat(isSelected ? null : seat.seat_no)}
                      title={isBooked ? `Sudah dipesan: ${seat.customer_name || 'Terkonfirmasi'}` : `Pilih kursi ${seat.seat_no}`}
                    >
                      {seat.seat_no}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Baris B */}
            <div className="seat-row">
              <span className="row-label">B</span>
              <div className="seat-cluster">
                {rowB.map((seat) => {
                  const isBooked = seat.status === 'BOOKED';
                  const isSelected = selectedSeat === seat.seat_no;
                  return (
                    <button
                      key={seat.seat_no}
                      className={`seat-button ${isBooked ? 'booked' : ''} ${isSelected ? 'selected' : ''}`}
                      disabled={isBooked}
                      onClick={() => setSelectedSeat(isSelected ? null : seat.seat_no)}
                      title={isBooked ? `Sudah dipesan: ${seat.customer_name || 'Terkonfirmasi'}` : `Pilih kursi ${seat.seat_no}`}
                    >
                      {seat.seat_no}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legenda Kursi */}
          <div className="seat-legend">
            <div className="legend-item">
              <div className="legend-box available"></div>
              <span>Tersedia</span>
            </div>
            <div className="legend-item">
              <div className="legend-box selected"></div>
              <span>Dipilih</span>
            </div>
            <div className="legend-item">
              <div className="legend-box booked"></div>
              <span>Terisi (Booked)</span>
            </div>
          </div>
        </section>

        {/* Sidebar Panel */}
        <aside className="sidebar">
          {/* Booking Form Panel */}
          <div className="panel-card">
            <h2 className="panel-title">Form Pemesanan</h2>

            {statusMsg && (
              <div className={`alert-box ${statusMsg.type === 'error' ? 'alert-error' : 'alert-success'}`}>
                {statusMsg.text}
              </div>
            )}

            <form onSubmit={handleBooking}>
              <div className="form-group">
                <label className="form-label">Kursi Terpilih</label>
                <input
                  type="text"
                  className="form-input"
                  readOnly
                  value={selectedSeat ? `Kursi ${selectedSeat}` : 'Silakan klik kursi di denah'}
                  style={{ color: selectedSeat ? '#facc15' : '#6b7280', fontWeight: 600 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nama Pemesan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  className="form-input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={!selectedSeat || loading}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={!selectedSeat || !customerName.trim() || loading}
              >
                {loading ? 'Memproses...' : 'Pesan Kursi Sekarang'}
              </button>
            </form>
          </div>

          {/* Sesi Pemesanan Saya */}
          {userBookings.length > 0 && (
            <div className="panel-card">
              <h2 className="panel-title" style={{ fontSize: '0.95rem' }}>Tiket Anda Sesi Ini</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {userBookings.map((b) => (
                  <div
                    key={b.booking_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#facc15' }}>Kursi {b.seat_no}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{b.customer_name} &bull; {b.time}</div>
                    </div>
                    <button
                      className="btn-cancel"
                      onClick={() => handleCancel(b.booking_id, b.seat_no)}
                      disabled={loading}
                    >
                      Batal
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Activity Stream */}
          <div className="panel-card">
            <h2 className="panel-title" style={{ fontSize: '0.95rem' }}>Aktivitas Terkini</h2>
            <div className="activity-list">
              {activities.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  Menunggu aktivitas pemesanan...
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className={`activity-item ${act.type}`}>
                    <span>{act.text}</span>
                    <span className="activity-time">{act.time}</span>
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

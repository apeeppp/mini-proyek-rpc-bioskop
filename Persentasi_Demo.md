# 🎬 Panduan & Script Demo Proyek CinemaHub (CinemaRPC)
**Durasi Maksimal:** 5 Menit (300 Detik)  
**Format Tim:** 3 Anggota  
**Tema:** Sistem Reservasi Tiket Bioskop Terdistribusi Berbasis gRPC, WebSocket, dan PostgreSQL  

---

## ⏱️ Pembagian Waktu Ringkas

| Sesi | Pembicara | Durasi | Topik Utama |
|---|---|:---:|---|
| **Bagian 1** | Anggota 1 | 00:00 - 01:25 (~85 dtk) | Pembuka, Latar Belakang Masalah Concurrency, Arsitektur Sistem 4-Tier |
| **Bagian 2** | Anggota 2 | 01:25 - 03:15 (~110 dtk) | Live Demo Web (2 Browser Bersisian), Sinkronisasi Realtime, Admin Panel |
| **Bagian 3** | Anggota 3 | 03:15 - 05:00 (~105 dtk) | Uji Race Condition via CLI, Benchmark Latensi & Throughput, Penutup |

---

## 🛠️ Persiapan Sebelum Tampil (Pre-Demo Setup)

1. **Jalankan Layanan Backend & Database:**
   ```bash
   docker compose up -d
   docker compose ps
   ```
2. **Jalankan Frontend React (Vite):**
   ```bash
   cd frontend
   npm run dev
   ```
3. **Persiapan Layar (Layout Display):**
   - Buka 2 jendela browser bersebelahan (*split-screen* kiri & kanan) di URL: `http://localhost:5173`.
   - Buka 1 jendela Terminal/PowerShell siap pakai untuk mengeksekusi perintah CLI.
   - Siapkan diagram arsitektur sistem (dari Landing Page atau README).

---

## 🎙️ Naskah & Panduan Aksi

### 👤 Anggota 1: Pembuka & Arsitektur Sistem
- **Waktu:** Menit 00:00 – 01:25 (85 detik)
- **Tampilan Layar:** Tampilkan Landing Page CinemaHub (fokus ke Hero Section dan Diagram Arsitektur).

#### Naskah Narasi:
> *"Halo semuanya, kami dari kelompok [Nama Kelompok]. Hari ini kami mempresentasikan **CinemaHub**, sistem reservasi tiket bioskop terdistribusi berbasis **gRPC, Protocol Buffers, FastAPI, WebSocket, dan PostgreSQL**.*
>
> *Tantangan terbesar pada sistem tiket adalah **concurrency**: bagaimana mencegah terjadinya **race condition** atau **double-booking** saat banyak pengguna memilih kursi yang sama di milidetik yang sama, sekaligus menyiarkan perubahan status kursi secara instan ke semua pengunjung tanpa polling berulang.*
>
> *Untuk menyelesaikan tantangan ini, kami mengimplementasikan arsitektur 4-tier:*
> 1. ***Frontend Tier:*** *React Single Page Application dengan antarmuka bertema bioskop modern.*
> 2. ***Gateway Tier:*** *FastAPI sebagai Backend-For-Frontend (BFF) yang menjembatani browser dengan WebSocket Hub.*
> 3. ***Core RPC Tier:*** *gRPC Server yang memproses transaksi bisnis menggunakan serialisasi Protocol Buffers biner berkecepatan tinggi.*
> 4. ***Database Tier:*** *PostgreSQL 16 dengan pengamanan transaksi tingkat tinggi: **Pessimistic Row-Level Locking (`SELECT FOR UPDATE`)**, **PostgreSQL Advisory Lock** untuk idempotensi request, dan **Partial Unique Index**.*
>
> *Sekarang rekan saya, [Nama Anggota 2], akan mendemonstrasikan pengalaman pengguna dan fitur sinkronisasi realtime-nya."*

---

### 👤 Anggota 2: Live Demo Aplikasi Web & Realtime Sync
- **Waktu:** Menit 01:25 – 03:15 (110 detik)
- **Tampilan Layar:** Dua jendela browser berdampingan (*split-screen* kiri dan kanan) di `http://localhost:5173`.

#### Naskah Narasi & Aksi:
> *"Terima kasih [Anggota 1]. Di layar, kita membuka dua sesi browser pengunjung secara berdampingan.*
>
> *(Aksi 1: Memesan Kursi)*  
> *Pengunjung di sebelah kiri memilih kursi **A1**, mengisi nama pemesan **'Budi'**, lalu menekan tombol **Konfirmasi Reservasi**.*
>
> *(Aksi 2: Tunjukkan Realtime Sync)*  
> *Perhatikan layar browser sebelah kanan: **tanpa perlu me-refresh halaman**, kursi A1 langsung berubah warna menjadi merah (Booked) dan terkunci seketika. Pembaruan ini disiarkan via WebSocket dari StreamManager gRPC dalam hitungan milidetik.*
>
> *(Aksi 3: Admin Panel & Pembatalan)*  
> *Sekarang kita gulir ke bawah ke bagian **Admin Panel & Transparansi Log Database**. Di sini admin melihat daftar transaksi aktual langsung dari database PostgreSQL, termasuk UUID booking dan timestamp-nya.*
> *Ketika admin menekan tombol **'Hapus / Kosongkan'** pada pesanan kursi A1, status kursi di kedua browser langsung kembali hijau (Available) dan siap dipesan kembali secara instan.*
>
> *Selanjutnya, rekan saya [Nama Anggota 3] akan menguji ketahanan sistem terhadap race condition serta performanya menggunakan gRPC CLI."*

---

### 👤 Anggota 3: Uji Race Condition, Benchmark & Penutup
- **Waktu:** Menit 03:15 – 05:00 (105 detik)
- **Tampilan Layar:** Jendela Terminal / Command Prompt.

#### Naskah Narasi & Aksi:
> *"Terima kasih [Anggota 2]. Untuk membuktikan keandalan sistem dalam kondisi ekstrem, kami menyediakan CLI Client berbasis gRPC.*
>
> *(Aksi 1: Simulasi Race Condition / Double-Booking)*  
> *Kita jalankan simulasi perebutan kursi yang sama secara serentak:*
> ```bash
> docker compose run --rm client race-test
> ```
> *(Arahkan ke output terminal)*  
> *Dua thread mencoba memesan kursi yang sama persis di milidetik yang sama. Terlihat hasilnya: **Hanya satu pemesanan yang sukses**, sementara pemesanan kedua ditolak dengan aman. Tidak terjadi double-booking berkat locking `SELECT FOR UPDATE` pada tingkat row database.*
>
> *(Aksi 2: Benchmark Throughput & Latensi)*  
> *Selanjutnya, kita uji performa throughput gRPC:*
> ```bash
> docker compose run --rm client benchmark
> ```
> *(Arahkan ke tabel metrik)*  
> *Sistem mampu melayani hingga **300+ request per detik** dengan latensi rata-rata di kisaran **15 milidetik**. Serialisasi Protocol Buffers terbukti jauh lebih ringan dan efisien dibanding REST JSON biasa.*
>
> *(Kesimpulan & Penutup)*  
> *Kesimpulannya, CinemaHub membuktikan bahwa integrasi gRPC, FastAPI WebSocket, dan PostgreSQL Locking mampu menghadirkan sistem tiket yang cepat, konsisten dari race condition, serta interaktif secara realtime.*
>
> *Sekian demonstrasi dari kelompok kami. Terima kasih!"*

---

## 💡 Contekan Pertanyaan Dosen / Penguji (Q&A Cheat Sheet)

1. **Bagaimana cara mencegah dua orang memesan kursi yang sama persis bersamaan?**
   - Transaksi database menggunakan `SELECT ... FOR UPDATE` untuk mengunci baris kursi sebelum menulis data reservasi.
   - Dilengkapi `Partial Unique Index` (`one_active_booking_per_seat`) pada PostgreSQL sehingga database akan menolak duplikasi kursi aktif di tingkat constraint.

2. **Bagaimana mencegah request duplikat akibat retry koneksi (Idempotensi)?**
   - Menggunakan `pg_advisory_xact_lock` berbasis hash `request_id` unik dari klien, sehingga request yang identik tidak dieksekusi dua kali.

3. **Bagaimana arsitektur pengiriman event realtime bekerja?**
   - Setelah gRPC mencatat booking, event di-push ke in-memory `StreamManager`. Gateway FastAPI berlangganan event tersebut lalu menyiarkannya via WebSocket ke semua browser yang terhubung.

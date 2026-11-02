# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## CinemaRPC
### Sistem Reservasi Tiket Bioskop Berbasis gRPC dan Docker

Versi: 1.0
Mata Kuliah: Komputasi Paralel dan Terdistribusi
Jenis Proyek: Mini Project Kelompok

## 1. Latar Belakang


Sistem reservasi tiket bioskop memungkinkan beberapa pelanggan memesan kursi untuk jadwal film yang sama. Ketika beberapa pelanggan mengirim permintaan pada waktu bersamaan, sistem berisiko mengalami race condition. Contohnya, dua pelanggan dapat mencoba memesan kursi A1 secara bersamaan.

CinemaRPC merupakan sistem reservasi tiket bioskop berbasis Remote Procedure Call (RPC). Sistem menggunakan gRPC dan Protocol Buffers untuk komunikasi client-server, serta PostgreSQL untuk menyimpan data kursi dan transaksi pemesanan. Docker dan Docker Compose digunakan untuk menjalankan komponen sistem dalam container terpisah.

## 2. Tujuan Proyek


1. Membangun sistem reservasi tiket bioskop menggunakan gRPC.
2. Mendefinisikan antarmuka layanan menggunakan Protocol Buffers.
3. Menangani pemesanan kursi secara bersamaan tanpa menghasilkan pemesanan aktif ganda.
4. Menerapkan concurrency control pada transaksi database.
5. Menerapkan timeout, retry, dan request ID untuk melindungi transaksi dari duplikasi.
6. Mengirim perubahan status kursi melalui server streaming.
7. Menjalankan sistem menggunakan Docker Compose dengan minimal dua container aplikasi yang saling berkomunikasi.
8. Mengukur latensi dan throughput pada 1, 5, dan 20 client bersamaan.

## 3. Ruang Lingkup


Fitur yang termasuk dalam ruang lingkup:

- Menampilkan daftar kursi berdasarkan jadwal film.
- Memesan kursi.
- Memantau perubahan status kursi secara streaming.
- Melihat detail pemesanan.
- Membatalkan pemesanan.
- Mendeteksi permintaan pemesanan yang dikirim ulang.
- Menangani beberapa client secara bersamaan.
- Menjalankan aplikasi dalam container Docker.
- Menguji timeout, retry, idempotensi, dan concurrency.
- Mengukur performa sistem.

Proyek ini berfokus pada backend dan komunikasi RPC. Antarmuka pengguna menggunakan command-line interface (CLI) agar demonstrasi fitur RPC mudah dilakukan.

Fitur di luar ruang lingkup versi awal:

- Integrasi pembayaran online.
- Payment gateway.
- Aplikasi mobile.
- Pengiriman tiket melalui email atau SMS.
- Integrasi dengan penyedia bioskop eksternal.

## 4. Pengguna Dan Komponen Sistem


4.1 Client/Pelanggan

Client mengirim permintaan RPC untuk melihat kursi, memesan kursi, memantau status kursi, melihat detail pemesanan, dan membatalkan pemesanan.

4.2 gRPC Server

Server menerima permintaan RPC, memvalidasi input, menjalankan logika reservasi, mengelola streaming status kursi, dan berkomunikasi dengan PostgreSQL.

4.3 PostgreSQL

PostgreSQL menyimpan jadwal film, data kursi, dan transaksi pemesanan. Data harus tetap tersedia setelah container server dihentikan atau dijalankan ulang.

4.4 Docker Compose

Docker Compose menjalankan database, server gRPC, dan client dalam service/container yang terpisah. Client mengakses server menggunakan nama service Docker pada jaringan internal Compose, bukan menggunakan localhost.

## 5. Arsitektur Sistem


Arsitektur terdiri dari komponen berikut:

1. Client container: menjalankan CLI dan mengirim request gRPC.
2. gRPC server container: menyediakan layanan reservasi pada port 50051.
3. PostgreSQL container: menyimpan data secara persisten melalui named volume.

Alur pemesanan:

1. Client mengirim PesanKursi dengan request_id, show_id, seat_no, dan customer_name.
2. Server memvalidasi data permintaan.
3. Server memeriksa apakah request_id pernah diproses.
4. Server membuka transaksi database dan mengunci atau memperbarui baris kursi secara atomik.
5. Server memeriksa ketersediaan kursi.
6. Jika kursi tersedia, server menyimpan booking dan mengubah status kursi menjadi BOOKED.
7. Server melakukan commit transaksi.
8. Server mengembalikan respons kepada client.
9. Server mengirim perubahan status kursi kepada subscriber streaming.

Jika kursi sudah dipesan, server menolak permintaan kedua dan tidak membuat booking aktif tambahan.

## 6. Kebutuhan Fungsional


FR-01: DaftarKursi

Client dapat meminta daftar kursi berdasarkan show_id. Server mengembalikan nomor kursi, status, dan informasi pemesan jika tersedia.

FR-02: PesanKursi

Client dapat memesan kursi dengan mengirim request_id, show_id, seat_no, dan customer_name. Server hanya menerima pemesanan jika kursi tersedia.

FR-03: StreamStatusKursi

Client dapat berlangganan perubahan status kursi untuk satu jadwal film. Server mengirim status awal dan pembaruan ketika kursi dipesan atau pemesanan dibatalkan.

FR-04: GetPemesanan

Client dapat mengambil detail transaksi menggunakan booking_id.

FR-05: BatalkanPemesanan

Client dapat membatalkan booking yang masih berstatus CONFIRMED. Server mengubah status booking menjadi CANCELLED dan mengembalikan kursi ke status AVAILABLE secara atomik.

## 7. Kontrak Rpc


Kontrak layanan didefinisikan dalam file proto/cinema.proto.

RPC 1: DaftarKursi
Jenis: Unary RPC.
Input: ShowRequest (show_id).
Output: SeatList (daftar kursi dan statusnya).

RPC 2: PesanKursi
Jenis: Unary RPC.
Input: BookSeatRequest (request_id, show_id, seat_no, customer_name).
Output: BookingResponse (success, message, booking_id, request_id, show_id, seat_no, customer_name, status).

RPC 3: StreamStatusKursi
Jenis: Server Streaming RPC.
Input: ShowRequest (show_id).
Output: Stream SeatStatus untuk perubahan status kursi.

RPC 4: GetPemesanan
Jenis: Unary RPC.
Input: BookingLookupRequest (booking_id).
Output: BookingResponse.

RPC 5: BatalkanPemesanan
Jenis: Unary RPC.
Input: CancelBookingRequest (request_id, booking_id).
Output: BookingResponse.

Dengan lima RPC tersebut, proyek memenuhi ketentuan minimal empat RPC dan minimal satu RPC streaming.

## 8. Model Data Dan Database


Database menggunakan PostgreSQL.

Tabel shows:
- show_id sebagai primary key.
- movie_title.
- show_time.
- auditorium.

Tabel seats:
- show_id.
- seat_no.
- status: AVAILABLE atau BOOKED.
- booking_id jika kursi sudah dipesan.
- updated_at.
- Primary key gabungan show_id dan seat_no.

Tabel bookings:
- booking_id sebagai primary key.
- request_id sebagai nilai unik.
- show_id.
- seat_no.
- customer_name.
- status: CONFIRMED atau CANCELLED.
- created_at.
- updated_at.

Tabel atau mekanisme idempotency records dapat digunakan untuk menyimpan request_id, payload hash, status proses, dan hasil respons. Desain final harus menjamin request_id yang sama tidak menghasilkan transaksi berbeda.

Sediakan sekurang-kurangnya satu jadwal film dengan 12 kursi awal, misalnya SHOW-001 dengan kursi A1-A6 dan B1-B6.

Constraint database harus mencegah lebih dari satu booking aktif untuk kursi dan jadwal yang sama. Gunakan transaksi database, row-level locking, unique constraint, partial unique index, atau kombinasi yang sesuai.

## 9. Concurrency Dan Konsistensi Data


Database menjadi sumber kebenaran untuk status kursi. Proteksi utama tidak boleh hanya bergantung pada threading.Lock di satu proses Python karena beberapa container atau proses server dapat berjalan secara terpisah.

Gunakan transaksi PostgreSQL dan SELECT FOR UPDATE atau operasi atomik yang setara.

Untuk dua client yang memesan kursi sama secara bersamaan:

- Hanya satu pemesanan aktif yang boleh berhasil.
- Permintaan lain menerima respons bahwa kursi telah dipesan.
- Database tidak boleh menyimpan dua booking aktif untuk show_id dan seat_no yang sama.
- Perubahan booking dan status kursi harus berada dalam satu transaksi database.

## 10. Idempotensi, Timeout, Dan Retry


Setiap operasi pemesanan menggunakan request_id unik.

Ketentuan:

1. Retry untuk operasi yang sama harus menggunakan request_id yang sama.
2. Jika request_id sudah diproses dengan payload yang sama, server mengembalikan hasil terdahulu.
3. Jika request_id yang sama dipakai dengan payload berbeda, server menolak permintaan.
4. Jika transaksi berhasil disimpan tetapi respons timeout, retry tidak boleh membuat booking baru.
5. Client menggunakan timeout yang dapat dikonfigurasi.
6. Client menggunakan exponential backoff dengan batas retry.
7. Kesalahan permanen seperti kursi sudah dipesan atau input tidak valid tidak perlu di-retry.
8. Pembatalan juga harus idempoten atau memiliki perlindungan terhadap pengiriman ulang.

## 11. Streaming Dan Pengelolaan Subscriber


StreamStatusKursi menggunakan server streaming.

Ketika client mulai berlangganan, server mengirim status awal kursi pada jadwal terkait. Setelah pemesanan atau pembatalan berhasil di-commit, server menerbitkan event status terbaru kepada subscriber.

Server harus:

- Mengelola subscriber aktif secara thread-safe.
- Menghapus subscriber ketika client membatalkan atau koneksi terputus.
- Menghindari kebocoran thread dan queue.
- Mengirim event setelah transaksi database berhasil commit.
- Menangani subscriber lambat atau terputus.

Untuk implementasi satu instance server, mekanisme in-memory dapat digunakan dengan penjelasan batasannya. Jika server dijalankan dengan beberapa replica, gunakan mekanisme pub/sub bersama agar event dapat diterima subscriber lintas replica. Jangan mengklaim dukungan lintas replica jika belum diimplementasikan.

## 12. Kebutuhan Docker


Gunakan minimal tiga service Docker Compose:

1. db: PostgreSQL.
2. server: gRPC server Python.
3. client: CLI client Python yang dijalankan sesuai kebutuhan.

Ketentuan:

- Gunakan Dockerfile untuk membangun image aplikasi.
- Gunakan compose.yaml.
- Gunakan named volume untuk data PostgreSQL.
- Tambahkan healthcheck PostgreSQL.
- Gunakan depends_on dengan service_healthy agar server menunggu database siap.
- Gunakan jaringan internal Docker Compose.
- Expose port gRPC 50051 ke host jika dibutuhkan.
- Client dalam container harus mengakses server melalui nama service Docker, bukan localhost.
- Gunakan environment variable untuk konfigurasi database dan server.
- Jangan menyimpan password asli di repository.
- Sediakan .env.example dan .gitignore.

Sistem harus mendukung dua atau lebih client container yang berjalan bersamaan.

## 13. Cli Client


Sediakan command-line interface dengan command minimal:

- list: melihat daftar kursi.
- book: memesan kursi.
- watch: memantau streaming status kursi.
- get: mengambil detail pemesanan.
- cancel: membatalkan pemesanan.
- benchmark: mengukur performa.
- race-test: menjalankan dua atau lebih client yang mencoba memesan kursi sama secara bersamaan.

Gunakan argparse atau Click. Respons harus menampilkan hasil yang jelas dan alasan ketika pemesanan ditolak.

## 14. Kebutuhan Nonfungsional


Keandalan:
Sistem mempertahankan konsistensi status kursi dan transaksi ketika terjadi permintaan bersamaan atau retry.

Concurrency:
Server menangani beberapa client tanpa membuat booking aktif ganda untuk kursi yang sama.

Performa:
Sistem menyediakan pengukuran waktu total, throughput, dan latensi rata-rata. Persentil ke-95 dapat ditambahkan.

Portabilitas:
Sistem dapat dijalankan menggunakan Docker Compose pada lingkungan yang mendukung Docker.

Maintainability:
Kode dipisahkan berdasarkan tanggung jawab, menggunakan nama konsisten, type hints jika sesuai, logging, dan penanganan exception.

Dokumentasi:
README menjelaskan instalasi, konfigurasi, generate stub, menjalankan container, command client, pengujian, dan troubleshooting.

## 15. Rencana Pengujian


Pengujian fungsional:
1. Daftar kursi berhasil.
2. Pemesanan kursi tersedia berhasil.
3. Pemesanan kursi yang sudah BOOKED ditolak.
4. Detail booking dapat diambil.
5. Pembatalan booking berhasil.
6. Kursi kembali AVAILABLE setelah pembatalan.

Pengujian concurrency:
1. Dua client memesan kursi sama secara bersamaan.
2. Hanya satu request berhasil.
3. Tidak ada dua booking aktif untuk kursi dan show yang sama.

Pengujian idempotensi:
1. Request ID sama dan payload sama tidak membuat booking baru.
2. Request ID sama dan payload berbeda ditolak.
3. Timeout setelah commit diikuti retry tidak membuat booking ganda.

Pengujian streaming:
1. Client menerima status awal.
2. Client menerima event setelah kursi dipesan.
3. Client menerima event setelah booking dibatalkan.
4. Subscriber dibersihkan ketika client terputus.

Pengujian Docker:
1. Database, server, dan client berjalan dalam container terpisah.
2. Dua client container dapat mengakses server.
3. Data tetap ada setelah server restart.
4. Data tetap ada setelah container database dibuat ulang selama named volume dipertahankan.

## 16. Benchmark


Lakukan benchmark pada 1, 5, dan 20 client bersamaan.

Gunakan operasi baca DaftarKursi untuk benchmark utama agar pengujian tidak mengubah status kursi dan tidak menimbulkan konflik booking.

Catat:
- Jumlah client bersamaan.
- Jumlah request.
- Jumlah request sukses.
- Jumlah error.
- Waktu total.
- Latensi rata-rata.
- Throughput dalam request per detik.
- Latensi persentil ke-95 jika memungkinkan.

Rumus throughput:
Throughput = jumlah request sukses / waktu total (detik)

Rumus latensi rata-rata:
Latensi rata-rata = total latensi request / jumlah request yang diukur

Hasil benchmark harus berasal dari eksekusi aktual. Jangan membuat angka pengukuran fiktif. Simpan hasil dalam CSV dan buat grafik untuk laporan.

## 17. Struktur Repository


CinemaRPC/
|-- app/
|   |-- server.py
|   |-- client.py
|   |-- database.py
|   |-- repository.py
|   |-- stream_manager.py
|   |-- benchmark.py
|   |-- config.py
|   |-- generated/
|-- proto/
|   |-- cinema.proto
|-- db/
|   |-- init.sql
|-- tests/
|   |-- conftest.py
|   |-- test_booking.py
|   |-- test_concurrency.py
|   |-- test_idempotency.py
|   |-- test_streaming.py
|-- scripts/
|   |-- generate_proto.py
|-- Dockerfile
|-- compose.yaml
|-- requirements.txt
|-- .env.example
|-- .gitignore
|-- README.md

Struktur dapat disesuaikan selama tanggung jawab setiap modul tetap jelas.

## 18. Kriteria Keberhasilan


Proyek memenuhi target apabila:

1. Lima RPC berfungsi.
2. Client dan server berkomunikasi menggunakan gRPC.
3. Sistem berjalan pada minimal dua container berbeda.
4. Dua client tidak dapat memesan kursi aktif yang sama.
5. Retry dengan request_id sama tidak membuat transaksi ganda.
6. Streaming mengirim pembaruan status kursi.
7. Timeout dan retry dapat didemonstrasikan.
8. Benchmark 1, 5, dan 20 client selesai.
9. Hasil benchmark tersedia dalam tabel, CSV, dan grafik.
10. README menjelaskan cara menjalankan sistem.
11. Repository memiliki riwayat commit masing-masing anggota kelompok.
12. Demo dapat dijalankan dan dijelaskan oleh anggota kelompok.

## 19. Batasan Dan Asumsi


Versi awal menggunakan satu jadwal film contoh dan satu instance gRPC server. PostgreSQL menjadi penyimpanan persisten. Sistem belum mencakup pembayaran, autentikasi eksternal, dan integrasi sistem bioskop sungguhan.

Perlu dijelaskan bahwa Docker Compose multi-container pada satu laptop membuktikan komunikasi antarkontainer, tetapi tidak sama dengan deployment pada dua komputer fisik. Jika dosen meminta dua komputer fisik, lakukan pengujian tambahan menggunakan host yang berbeda.

## 20. Referensi


- Modul Latihan & Praktikum Remote Procedure Calls (RPC), Mata Kuliah Komputasi Paralel dan Terdistribusi, bagian Tugas Proyek Mini.
- Python Documentation: https://docs.python.org/3/
- gRPC Documentation: https://grpc.io/docs/
- Protocol Buffers Documentation: https://protobuf.dev/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Docker Documentation: https://docs.docker.com/
- Docker Compose Documentation: https://docs.docker.com/compose/

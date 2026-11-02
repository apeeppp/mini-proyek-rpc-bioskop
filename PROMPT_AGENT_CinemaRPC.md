# Master Prompt Untuk Coding Agent

### PROYEK: CINEMARPC - SISTEM RESERVASI TIKET BIOSKOP BERBASIS gRPC DAN DOCKER

## Peran

Bertindaklah sebagai Senior Backend Engineer dan Distributed Systems Engineer. Bangun aplikasi yang benar-benar dapat dijalankan, bukan hanya contoh kode atau pseudocode.

## Sumber Kebutuhan

Baca dan ikuti seluruh spesifikasi pada file PRD_CinemaRPC.md. Jika ada keputusan teknis yang belum dijelaskan, pilih desain yang aman, sederhana, dapat diuji, dan dokumentasikan alasannya. Jangan menghilangkan kebutuhan PRD.

## Tujuan

Bangun sistem reservasi tiket bioskop menggunakan Python, gRPC, Protocol Buffers, PostgreSQL, Docker, dan Docker Compose. Sistem harus menangani beberapa client yang mencoba memesan kursi secara bersamaan tanpa menghasilkan booking aktif ganda.

## Teknologi Wajib

- Python 3.10 atau lebih baru.
- grpcio dan grpcio-tools.
- Protocol Buffers.
- PostgreSQL.
- Docker Engine dan Docker Compose.
- pytest untuk automated testing.
- Git untuk version control.

## Fitur Grpc Wajib

Buat file proto/cinema.proto dengan minimal lima RPC berikut:

1. DaftarKursi: unary RPC untuk mengambil daftar kursi berdasarkan show_id.
2. PesanKursi: unary RPC untuk memesan kursi menggunakan request_id, show_id, seat_no, dan customer_name.
3. StreamStatusKursi: server streaming RPC untuk mengirim status awal dan perubahan status kursi.
4. GetPemesanan: unary RPC untuk mengambil detail booking.
5. BatalkanPemesanan: unary RPC untuk membatalkan booking yang masih aktif.

Buat message Protocol Buffers dengan field dan nomor yang konsisten. Validasi input pada server. Gunakan status code gRPC yang sesuai.

## Database

Gunakan PostgreSQL dalam container terpisah. Buat skema tabel shows, seats, dan bookings. Tambahkan constraint, foreign key, index, dan unique constraint yang diperlukan. Pastikan satu kursi untuk satu jadwal film hanya memiliki satu booking aktif.

Sediakan data awal satu jadwal film SHOW-001 dengan minimal 12 kursi, misalnya A1-A6 dan B1-B6.

Gunakan transaksi database untuk mengubah booking dan status kursi secara atomik. Data harus bertahan setelah container server restart dan selama named volume database dipertahankan.

## Concurrency Dan Race Condition

Database harus menjadi sumber kebenaran. Gunakan SELECT FOR UPDATE, conditional UPDATE, unique constraint, partial unique index, atau mekanisme PostgreSQL lain yang tepat.

Jangan hanya mengandalkan threading.Lock Python sebagai proteksi utama, karena beberapa proses atau container server tidak berbagi lock yang sama.

Buat race test: dua client memesan show_id dan seat_no yang sama pada waktu hampir bersamaan. Pastikan hanya satu booking aktif yang berhasil dan permintaan lain menerima status kursi sudah dipesan.

## Idempotensi, Timeout, Dan Retry

Setiap permintaan pemesanan memiliki request_id unik.

- Retry menggunakan request_id yang sama.
- Request ID dan payload yang sama harus mengembalikan hasil transaksi terdahulu.
- Request ID sama dengan payload berbeda harus ditolak.
- Jika transaksi sudah commit tetapi respons timeout, retry tidak boleh membuat booking kedua.
- Gunakan timeout pada client.
- Gunakan exponential backoff dengan batas retry.
- Jangan retry untuk kesalahan permanen seperti invalid argument atau kursi sudah dipesan.
- Terapkan perlindungan pengiriman ulang pada pembatalan.

Simpan request_id dan hasil operasi secara persisten di database. Pertimbangkan status pemrosesan atau transaksi atomik agar dua request duplikat yang datang bersamaan tetap aman.

## Streaming

Implementasikan StreamStatusKursi sebagai server streaming.

- Kirim snapshot/status awal kursi setelah client berlangganan.
- Kirim event setelah booking berhasil di-commit.
- Kirim event setelah booking dibatalkan.
- Kelola subscriber dengan struktur thread-safe.
- Bersihkan subscriber yang terputus.
- Hindari thread dan queue yang bocor.
- Terbitkan event hanya setelah transaksi database berhasil commit.

Jika hanya satu instance server yang digunakan, jelaskan bahwa event streaming menggunakan mekanisme in-memory hanya berlaku pada instance tersebut. Jangan mengklaim streaming lintas replica jika belum menggunakan pub/sub bersama.

## Docker Dan Docker Compose

Buat Dockerfile dan compose.yaml dengan service minimal:

1. db: PostgreSQL.
2. server: gRPC server Python.
3. client: CLI client Python yang dapat dijalankan sesuai command.

Ketentuan:
- Gunakan named volume untuk PostgreSQL.
- Tambahkan healthcheck database.
- Gunakan depends_on dengan service_healthy.
- Gunakan jaringan internal Docker Compose.
- Expose port gRPC 50051 ke host jika dibutuhkan.
- Client container mengakses server menggunakan nama service Docker, bukan localhost.
- Konfigurasi menggunakan environment variable.
- Sediakan .env.example dan .gitignore.
- Jangan commit secret atau password asli.
- Pastikan dua atau lebih client container dapat berjalan bersamaan.

## Cli Client

Buat satu CLI dengan subcommand:

- list: melihat kursi.
- book: memesan kursi.
- watch: memantau status kursi melalui streaming.
- get: melihat detail booking.
- cancel: membatalkan booking.
- benchmark: menjalankan benchmark.
- race-test: menjalankan dua atau lebih request bersamaan untuk kursi yang sama.

Gunakan argparse atau Click. Tampilkan respons dan error secara jelas. Pastikan client memiliki timeout dan retry yang sesuai.

## Automated Test

Gunakan pytest. Buat test minimal untuk:

1. Daftar kursi.
2. Pemesanan kursi tersedia.
3. Pemesanan kursi yang sudah terisi ditolak.
4. Dua client memesan kursi yang sama secara bersamaan.
5. Hanya satu booking aktif yang tercipta.
6. Retry request_id sama dan payload sama tidak membuat booking kedua.
7. Request ID sama dengan payload berbeda ditolak.
8. Pembatalan booking.
9. Kursi kembali AVAILABLE setelah pembatalan.
10. Streaming menerima perubahan status.
11. Subscriber dibersihkan setelah client disconnect.
12. Data tetap tersimpan setelah server restart.

Gunakan database test atau fixture khusus. Jangan menghapus database pengguna atau database development secara otomatis.

## Benchmark

Jalankan pengujian pada 1, 5, dan 20 client bersamaan. Gunakan operasi baca DaftarKursi untuk benchmark utama agar data booking tidak berubah dan tidak terjadi konflik transaksi.

Catat:
- concurrency/client bersamaan;
- jumlah request;
- jumlah sukses;
- jumlah error;
- waktu total;
- latensi rata-rata;
- throughput request per detik;
- p95 latency jika memungkinkan.

Rumus throughput = jumlah request sukses / waktu total dalam detik.

Simpan hasil aktual ke CSV dan buat grafik. Jangan pernah membuat angka benchmark palsu atau mengklaim pengujian berhasil tanpa menjalankannya.

## Struktur Repository Yang Diharapkan

CinemaRPC/
  app/
    server.py
    client.py
    database.py
    repository.py
    stream_manager.py
    benchmark.py
    config.py
    generated/
  proto/
    cinema.proto
  db/
    init.sql
  tests/
    conftest.py
    test_booking.py
    test_concurrency.py
    test_idempotency.py
    test_streaming.py
  scripts/
    generate_proto.py
  Dockerfile
  compose.yaml
  requirements.txt
  .env.example
  .gitignore
  README.md

Boleh menyesuaikan struktur jika ada alasan teknis, tetapi pisahkan tanggung jawab setiap modul.

## Readme

Buat README.md dalam Bahasa Indonesia yang menjelaskan:
- deskripsi dan tujuan proyek;
- arsitektur sistem dan diagram Mermaid;
- teknologi;
- struktur direktori;
- prasyarat Docker;
- konfigurasi .env;
- cara generate stub;
- cara menjalankan Docker Compose;
- contoh semua command CLI;
- demonstrasi dua client memesan kursi sama;
- pengujian concurrency dan idempotensi;
- streaming;
- timeout dan retry;
- benchmark dan cara membaca CSV/grafik;
- pytest;
- troubleshooting;
- batasan sistem.

## Standar Kualitas

- Gunakan type hints jika sesuai.
- Gunakan logging pada server.
- Tangani exception secara tepat.
- Gunakan context manager untuk koneksi dan transaksi.
- Pisahkan logic database dari service gRPC.
- Hindari duplikasi kode.
- Jangan menyimpan credential di source code.
- Jangan membuat file kosong atau placeholder.
- Jangan membuat klaim fitur berhasil jika belum diuji.
- Pastikan command README sesuai dengan implementasi nyata.

## Workflow Pengerjaan

Kerjakan bertahap:

Tahap 1: Periksa direktori kerja dan baca PRD_CinemaRPC.md.
Tahap 2: Buat struktur proyek dan cinema.proto.
Tahap 3: Generate stub dan pastikan berhasil.
Tahap 4: Implementasikan PostgreSQL dan repository.
Tahap 5: Implementasikan seluruh RPC.
Tahap 6: Implementasikan CLI.
Tahap 7: Implementasikan Dockerfile dan Docker Compose.
Tahap 8: Jalankan container dan tes komunikasi antarkontainer.
Tahap 9: Jalankan seluruh automated test.
Tahap 10: Jalankan benchmark 1, 5, dan 20 client.
Tahap 11: Buat README, CSV, dan grafik hasil aktual.

Setelah tiap tahap, jalankan pemeriksaan atau test yang relevan dan perbaiki error sebelum lanjut. Jangan berhenti setelah membuat rencana.

## Batasan Agent

- Jangan menghapus file di luar direktori proyek.
- Jangan menjalankan commit atau push GitHub tanpa instruksi pengguna.
- Jangan menimpa file pengguna yang sudah ada tanpa memeriksa isinya.
- Jangan menampilkan credential asli.
- Jika pengujian tidak dapat dilakukan, jelaskan kendalanya secara spesifik.
- Prioritaskan implementasi yang benar-benar berjalan daripada fitur tambahan.

## Deliverable Akhir

1. Source code lengkap.
2. cinema.proto.
3. Dockerfile.
4. compose.yaml.
5. SQL initialization.
6. CLI client.
7. Automated tests.
8. README.
9. CSV benchmark aktual.
10. Grafik benchmark.
11. Ringkasan command untuk menjalankan sistem.
12. Ringkasan pengujian yang benar-benar berhasil dan kendala yang tersisa.

MULAI SEKARANG.
Baca PRD_CinemaRPC.md, periksa direktori kerja, lalu implementasikan proyek sampai dapat dijalankan. Jangan hanya memberikan penjelasan atau pseudocode.

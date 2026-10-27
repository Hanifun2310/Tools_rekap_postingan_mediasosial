# Tools Rekap Postingan Media Sosial (IG & FB Compliance Ledger)

Aplikasi internal berbasis Next.js App Router & Supabase untuk mencatat dan melacak kepatuhan interaksi karyawan (Like & Komentar) pada postingan resmi media sosial (Instagram & Facebook).

---

## 🌟 Fitur Utama

- **Otomasi Penarikan Komentar:** Integrasi langsung dengan API penarik komentar postingan media sosial untuk mengambil komentar & username pengomentar secara otomatis.
- **Karantina Akun Belum Terpetakan (1-Click Bind):** Menampung akun media sosial pengomentar yang belum terdaftar di master data karyawan, dengan fitur tautkan akun ke karyawan secara instan.
- **Matriks Kepatuhan Interaksi:** Dashboard visual persentase kehadiran per divisi dengan filter status (Semua / Sudah Interaksi / Belum Interaksi).
- **Generator Laporan WhatsApp:** Menyalin format pesan pengingat kepatuhan siap kirim ke WhatsApp per divisi dalam 1 klik.
- **Tutup Buku Bulanan (Export CSV & Purge):** Unduh arsip bulanan format CSV (UTF-8 BOM) dan pembersihan log interaksi agar penggunaan database tetap efisien dan gratis (Zero-Cost Operation).
- **Manajemen Karyawan:** Input manual satu per satu atau import massal via file CSV/Excel dengan template siap pakai.

---

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router, Turbopack)
- **Styling:** Tailwind CSS (Tactile Editorial Ledger Design System, Pure 2D)
- **Database:** Supabase (PostgreSQL)
- **Icons:** Lucide React & Custom SVG Social Icons

---

## 🚀 Memulai Instalasi Lokal

### 1. Kloning Repositori
```bash
git clone https://github.com/Hanifun2310/Tools_rekap_postingan_mediasosial.git
cd Tools_rekap_postingan_mediasosial
```

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Salin file `.env.example` ke `.env.local`:
```bash
cp .env.example .env.local
```

Buka file `.env.local` dan isi kredensial Anda:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
APIFY_API_TOKEN=your_apify_token
```

### 4. Setup Database Supabase
Jalankan skrip SQL di file `supabase/schema.sql` pada menu **SQL Editor** di dashboard Supabase Anda.

### 5. Jalankan Server Development
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 📄 Lisensi
Private / Proprietary.

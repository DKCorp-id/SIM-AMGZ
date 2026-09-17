# AMG Ops

Dashboard operasional internal **Amazing Malang Group** — 4 brand, 6 modul: Konten, CRM, Settings, Breakdown, Users, Ranking.

Bahasa UI Indonesia. Zona waktu `Asia/Jakarta`. Uang IDR disimpan `bigint`.

Stack: **TanStack Start + Better Auth + Postgres**. Deploy ke **Vercel**. Database: **Neon** (otomatis dari Grok Publish) atau **Supabase Postgres** (`DATABASE_URL`). Bukan Supabase Auth.

## Preview vs production

| | Preview (Grok) | Production (Vercel) |
|---|---|---|
| Database | PGLite in-memory (reset tiap restart) | Postgres via `DATABASE_URL` |
| Login | Papan 15 akun simulasi | Email/kata sandi. Admin pertama klaim setup awal |
| Simulasi | Tombol ganti akun | Disembunyikan |
| User baru | Akun UAT sudah ada | Undangan dari Admin/GM + tautan set kata sandi |

## Cara pasang: Supabase + Vercel (untuk pemula)

Analoginya: **Supabase = lemari data**, **Vercel = alamat website**. Login karyawan **bukan** milik Supabase. Di Supabase kita hanya memakai database Postgres.

Dua jalan. **A.** Tombol Publish di Grok — paling mudah, Neon otomatis, tanpa Supabase. **B.** Akun Vercel + Supabase sendiri — langkah di bawah. Pilih satu.

### 0. Siapkan

- Laptop + browser.
- Email (Gmail cukup). Paket gratis Vercel Hobby + Supabase Free cukup.
- Kode AMG Ops sudah di **GitHub** (Vercel mengambil dari situ). Jangan unggah folder `node_modules`.

### 1. Buat project Supabase

1. Buka [supabase.com](https://supabase.com) → Start your project.
2. **New project**. Nama contoh `amg-ops`.
3. **Database password**: buat yang kuat, simpan di catatan. Ini **bukan** sandi login karyawan.
4. Region: yang dekat Asia (Singapore jika ada). Create. Tunggu sampai hijau.
5. **Jangan** pakai menu Authentication. Jangan buat user di sana.

### 2. Salin `DATABASE_URL` yang benar

1. Di project, ketuk **Connect** (atas). Jendela “Connect to your project” terbuka.
2. **Jangan** diam di tab **Framework** (Next.js, `npm install`, `NEXT_PUBLIC_SUPABASE_…`). AMG Ops tidak memakai itu.
3. Ketuk tab ketiga: **Direct — Connection string**.
4. Pilih **Session pooler**. Port harus **5432**.
5. **Bukan** Transaction pooler. **Bukan** port **6543** (login akan gagal — Better Auth memakai prepared statement).
6. Salin URI bentuk:

```
postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

7. Ganti password. Karakter `# @ % ? &` spasi harus di-percent-encode.

### 3. Buat project Vercel

1. Buka [vercel.com](https://vercel.com), masuk dengan GitHub.
2. **Add New → Project** → pilih repo → **Import**.
3. Build Command biarkan `npm run build`.
4. **Jangan Deploy dulu** — isi variabel dulu.

### 4. Environment Variables

Vercel → Project → **Settings → Environment Variables**. Centang Production + Preview + Development.

| Nama | Wajib | Isi |
|---|---|---|
| `DATABASE_URL` | ya | URI Session pooler langkah 2 |
| `BETTER_AUTH_URL` | ya | Origin publik tanpa `/` di akhir, contoh `https://amg-ops.vercel.app` |
| `BETTER_AUTH_SECRET` | ya | Acak ≥ 32 karakter. Buat di [generate-secret.vercel.app/32](https://generate-secret.vercel.app/32) |
| `AMG_SIM_SEED` | tidak | `true` hanya jika ingin 15 akun latihan di server ini |

Jangan pernah menaruh `DATABASE_URL` dengan awalan `VITE_` — bocor ke browser.

Setelah deploy pertama, salin URL `*.vercel.app`, tempel ke `BETTER_AUTH_URL`, **Redeploy**. Kalau tidak sama persis dengan bilah alamat, login error “Invalid origin”.

### 5. Deploy

Deployments → Deploy / Redeploy. Saat build, `npm run build` menjalankan `db:migrate` — schema 4 brand + tabel login masuk otomatis. Tidak perlu menempel SQL di SQL Editor, kecuali build gagal.

### 6. Admin pertama

1. Buka URL Vercel. Form **Admin pertama** (bukan papan 15 nama).
2. Isi nama, email kerja, sandi ≥ 8 karakter.
3. **Kelola User → Undang**. Salin tautan set sandi, kirim ke email/WA.
4. Mereka buka tautan, buat sandi, masuk. Tidak ada daftar publik.

### Kalau error

| Gejala | Artinya |
|---|---|
| 500 / login rusak | `DATABASE_URL` salah atau port **6543** |
| Invalid origin | `BETTER_AUTH_URL` tidak sama dengan URL di browser |
| Form admin tidak muncul | Sudah ada admin, atau migrasi belum jalan |
| Sandi DB baru di-reset | Tunggu 1–2 menit, Redeploy |

Google / X hanya jalan di preview Grok. Production Vercel: email + kata sandi.

## Peran

- Admin / GM: lintas brand. Read-only di Konten & CRM.
- Editor: hanya konten `created_by` dirinya. Deep-link milik editor lain → 403.
- Kreator: tugas yang di-assign. Unggah = tempel tautan postingan, bukan file galeri.
- Sales: lead yang di-assign.

## Bukan Phase 1

Notifikasi, reminder tindak lanjut, angka aktual KPI sosmed, API Instagram/TikTok, kalender konten visual.

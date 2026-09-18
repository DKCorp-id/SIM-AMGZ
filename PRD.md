# PRD — AMG Ops (Amazing Malang Group Internal Operations)

| | |
|---|---|
| **Produk** | AMG Ops |
| **Versi dokumen** | 1.0 |
| **Tanggal** | 18 September 2026 |
| **Status** | Phase 1 — implementasi berjalan, UAT produksi |
| **Pemilik produk** | Amazing Malang Group (DKCorp) |
| **Klasifikasi** | Internal — tidak untuk publik |
| **Bahasa UI** | Indonesia |
| **Zona waktu** | Asia/Jakarta (WIB) |
| **Mata uang** | IDR, disimpan sebagai bilangan bulat (`bigint`) |

---

## 1. Ringkasan eksekutif

AMG Ops adalah **papan kerja internal** Amazing Malang Group. Bukan Instagram, bukan CRM publik, bukan website klien.

Tujuannya: satu tempat agar Editor merencanakan konten, Kreator menandai video yang sudah tayang, Sales menggeser prospek, Admin/GM mengatur orang, target, dan ranking — **tanpa saling menginjak data brand lain**.

Phase 1 mengganti spreadsheet/WA yang tercerai. Phase 2 (nanti) baru menyentuh notifikasi otomatis, angka KPI sosmed aktual, dan kalender visual.

---

## 2. Masalah yang diselesaikan

| Sekarang (tanpa AMG Ops) | Dampak | Dengan AMG Ops |
|---|---|---|
| Rencana konten di chat / sheet terpisah | Editor tidak tahu siapa yang mengerjakan, Kreator tidak tahu prioritas | Satu antrian per brand, assign jelas |
| “Sudah upload” = kirim file ke grup | File berat, tautan hilang, tidak bisa diaudit | Kreator menempel tautan postingan publik |
| Pipeline sales di kepala / Excel | Deal tidak masuk ranking, GM tidak lihat cadangan target | CRM 6 tahap + ranking per bulan |
| User baru daftar sendiri | Akun liar, role kacau | Hanya undangan Admin/GM |
| Empat brand campur | Data bocor antar editor | Isolasi per `created_by` / `assigned_to` / brand |

---

## 3. Tujuan produk (Phase 1)

1. Empat brand aktif di satu sistem, data tidak tercampur.
2. Setiap orang hanya melihat pekerjaan yang menjadi haknya.
3. Kreator **tidak mengunggah file video** ke server; hasil kerja = tautan `http(s)://` postingan yang sudah tayang.
4. Sales punya papan 6 tahap; Deal/Jalan/Selesai masuk ranking bulan `deal_at` (WIB).
5. Admin mengatur pilar, target, ambang ranking, dan undangan user.
6. GM membagi target brand ke masing-masing sales (breakdown); cadangan merah = peringatan, tetap boleh simpan.
7. Produksi: email + kata sandi. Bukan login Google/X (itu hanya preview Grok). Bukan Supabase Auth.

---

## 4. Bukan tujuan Phase 1

Sengaja **tidak** dikerjakan kecuali diminta terpisah:

- Notifikasi email/WA otomatis
- Reminder tindak lanjut CRM
- Angka aktual views/likes dari Instagram/TikTok
- API resmi Instagram, TikTok, YouTube, Facebook, Threads
- Kalender konten visual (grid bulan)
- Pendaftaran publik
- Aplikasi HP native
- Multi-bahasa
- Role custom di luar Admin / GM / Editor / Kreator / Sales
- Brand kelima (Salt & Sour **bukan** brand AMG)

---

## 5. Pengguna dan persona

| Persona | Siapa | Pekerjaan utama di AMG Ops | Layar pertama |
|---|---|---|---|
| **Admin** | Pemilik / ops platform | Undang orang, pilar, KPI setting, target, threshold, data latihan | `/settings` |
| **GM** | General Manager lintas brand | Breakdown target, lihat ranking, lihat konten/CRM (baca) | `/breakdown` |
| **Editor** | Perencana konten 1 brand | Buat rencana, assign Kreator, edit rencana sendiri | `/konten` |
| **Kreator** | Pembuat video 1 brand | Kerjakan tugas assign, tempel tautan, ubah status | `/tugas` |
| **Sales** | Business development 1 brand | Isi lead, geser tahap, catat activity, isi hasil kerja sama | `/crm` |

Satu orang boleh punya **lebih dari satu flag** (misalnya Editor + Sales) di brand yang sama. Admin dan GM adalah peran platform (`role`), bukan flag brand.

---

## 6. Empat brand (master data)

| ID | Nama tampilan | Platform aktif Phase 1 |
|---|---|---|
| `amazing-malang` | Amazing Malang | Instagram, TikTok, Facebook, Threads, YouTube |
| `ame` | Amazing Malang Eats | Instagram, TikTok, Facebook, Threads |
| `mata-malang` | Mata Malang | Instagram, TikTok, Facebook, Threads |
| `sam-ongis` | Sam Ongis | Instagram, TikTok, Facebook, Threads |

**Dilarang** menambah Salt & Sour atau brand fiktif lain di produksi.

Pilar default:

- Amazing Malang: Cerita Kota, Identitas Malang, Tokoh, Tempat
- AME: Cita Rasa, Petualangan Kuliner, Resep & Tips
- Mata Malang: Sudut Pandang Warga, Momen Harian, Ruang Publik
- Sam Ongis: Komedi Harian, Observasi Sosial, Curhat Receh

Admin boleh menambah/ubah nama pilar per brand.

---

## 7. Hak akses (matriks)

Keterangan: **R** baca, **W** tulis, **—** tidak terlihat / 403.

| Modul | Admin | GM | Editor | Kreator | Sales |
|---|---|---|---|---|---|
| Konten Saya `/konten` | R semua brand | R semua brand | W hanya `created_by` = dirinya | — | — |
| Detail konten `/konten/:id` | R | R | R/W milik sendiri; milik editor lain → 403 | R jika di-assign | — |
| Tugas Konten `/tugas` | — | — | — | W tugas `assigned_to` = dirinya | — |
| CRM `/crm` | R semua (tidak geser status lead orang lain) | R semua (tidak geser status lead orang lain) | — | — | W lead `assigned_to` = dirinya |
| Breakdown `/breakdown` | R | W alokasi sales | — | — | — |
| Setting Admin `/settings` | W | — | — | — | — |
| Kelola User `/users` | W undang Admin/GM/brand | W undang user brand saja | — | — | — |
| Ranking `/ranking` | R semua brand | R semua brand | — | — | R brand sendiri |
| Panduan `/panduan` | R | R | R | R | R |

Aturan tambahan:

- Editor **tidak** mengubah status menjadi Publish. Itu Kreator, setelah video tayang.
- Kreator **wajib** menempel tautan `http`/`https` saat Publish.
- Admin/GM **read-only** di Konten dan CRM (tidak mengisi kartu orang lain).
- User nonaktif (`is_active = false`) tidak bisa masuk dashboard.
- Minimal 1 Admin aktif; Admin tidak boleh menonaktifkan Admin terakhir.
- GM tidak boleh mengubah akun Admin/GM lain.

---

## 8. Modul fungsional

### 8.1 Autentikasi dan onboarding

**Login produksi**

- Email kerja + kata sandi (min. 8).
- Tidak ada daftar publik (`/daftar` menolak dan mengarahkan ke login).
- Cookie sesi same-origin. Origin harus cocok dengan `BETTER_AUTH_URL` (tanpa `/` di akhir).
- Google / X **tidak** dipakai di Vercel.

**Admin pertama**

- Jika belum ada profil `role = admin` aktif, tampil form **Admin pertama** di login.
- Akun itu menjadi Admin platform.
- Setelah ada Admin, form ini tidak muncul lagi.

**Undangan**

- Admin/GM mengisi nama, email, jenis (Admin / GM / brand), brand, dan flag Editor/Kreator/Sales.
- Sistem membuat user credential + profil + tautan `/reset-password?token=…` berlaku 48 jam.
- **Phase 1 tidak mengirim email otomatis.** Admin menyalin tautan ke WA/email kerja.
- Penerima membuka tautan, membuat kata sandi, lalu masuk.

**Lupa sandi**

- Preview: sistem bisa menampilkan tautan.
- Produksi Phase 1: user diminta minta Admin kirim tautan reset dari Kelola User (tidak ada SMTP).

**Data latihan**

- Saat Admin pertama masuk dan konten masih kosong, sistem boleh mengisi beberapa konten + lead contoh (bertanda `[SIMULASI]`).
- Di Pengaturan: tombol **Isi data latihan** dan **Hapus latihan, sisakan Admin**.
- Hapus latihan menghapus konten, lead, user non-admin. Empat brand dan akun Admin tetap.

### 8.2 Konten (Editor)

Field wajib: tanggal tayang, platform (hanya yang aktif di brand), format sesuai platform, pilar, tema.

Field opsional: assign Kreator, catatan/brief.

Status: `rencana` → `draft` → `publish` | `batal`.

Aturan:

- Editor hanya membuat konten untuk **brand-nya**.
- Assign Kreator boleh kosong selama status Rencana.
- Hapus hanya Rencana/Draft milik sendiri.
- Deep-link konten editor lain → 403.
- Riwayat perubahan tercatat di `content_activity`.

Format per platform:

| Platform | Format |
|---|---|
| Instagram | Reel, Post Feed, Carousel, Story, Live |
| TikTok | Video Short, Slideshow, Live |
| Facebook | Post Feed, Reel, Story, Video |
| Threads | Text Post, Post + Image |
| YouTube | Video Long, Shorts, Community Post |

### 8.3 Tugas Konten (Kreator)

Antrian hanya item `assigned_to` = user login.

Alur unggah hasil (bukan file):

1. Kerjakan video di HP / aplikasi sosmed.
2. Pastikan postingan **publik**, bukan draf.
3. Salin tautan postingan (bukan tautan profil).
4. Di Tugas, tempel tautan, status **Publish**.
5. Salah tautan: buka lagi, tempel yang benar. Publish boleh mundur ke Draft jika belum final.

Tanpa tautan valid, Publish ditolak.

### 8.4 CRM Pipeline (Sales)

Enam kolom: **Baru → Dihubungi → Nego → Deal → Jalan → Selesai**.

Field lead: nama klien, PIC, jabatan, HP (wajib), email, sumber, kategori, prioritas, brief, nilai (IDR).

Sumber: Referral, DM Instagram, Website, Event, Lainnya.  
Kategori: Kolaborasi Konten, Sponsored Post, Event, Iklan, Lainnya.  
Prioritas: Tinggi, Sedang, Rendah.

Activity: telepon, WA, meeting, email, kirim_proposal + catatan + tindak lanjut.

Aturan:

- Geser ke Deal/Jalan/Selesai mengisi `deal_at` (sekali, WIB) jika belum ada — ini kunci ranking.
- Arsip (`deleted_at`) hanya untuk Baru, Dihubungi, Nego. Deal/Jalan/Selesai tidak boleh diarsip.
- Hasil kerja sama (jenis Barter / Berbayar / Kombinasi, nilai final, periode, deliverables) hanya untuk Deal/Jalan/Selesai.
- Ranking memakai `nilai_final` jika ada, else `nilai`.

### 8.5 Setting Admin

Tab:

1. **Pilar** — daftar pilar per brand, urutan.
2. **KPI Platform** — metrik mana yang *akan* dilacak (Phase 1 hanya konfigurasi, bukan angka aktual).
3. **Sales Target** — target IDR per brand per `YYYY-MM`.
4. **Threshold Ranking** — hijau jika total deal ≥ `green_min`, oranye jika ≥ `orange_min`, merah di bawah itu. Hijau harus > oranye.

Default threshold: hijau Rp 100.000.000, oranye Rp 50.000.000.

### 8.6 Breakdown (GM)

Per bulan, GM membagi target brand ke sales brand itu.

- Jumlah alokasi boleh kurang dari target (cadangan).
- Jika alokasi > target, UI peringatan merah; **tetap boleh simpan** (warning, bukan hard-block).

### 8.7 Kelola User

- Daftar nama, email, brand, flag, status aktif.
- Undang, edit flag (bukan ganti brand jika user sudah punya data), nonaktifkan, kirim tautan reset.
- User brand wajib minimal satu flag (Editor/Kreator/Sales).
- Email unik di `user` dan `profiles`.

### 8.8 Ranking Sales

- Filter bulan (lalu, ini, depan relatif ke WIB).
- Per brand: urut total deal desc, lalu jumlah deal, lalu nama.
- Warna sesuai threshold brand.
- Sales hanya melihat brand-nya; Admin/GM semua brand.

### 8.9 Panduan

Halaman berbahasa Indonesia, langkah bernomor, terpisah per peran. Termasuk cara tempel tautan dan (untuk Admin) ringkasan pasang Vercel/Supabase.

---

## 9. Aturan bisnis yang tidak boleh dilanggar

1. **Unggah = tautan, bukan file.** Server tidak menyimpan video/gambar hasil konten.
2. **Tidak ada self-signup.**
3. **Isolasi Editor:** tidak melihat rencana editor lain di brand yang sama.
4. **Isolasi Kreator/Sales:** hanya baris yang di-assign.
5. **IDR tanpa desimal** di database.
6. **Waktu bisnis = WIB**, termasuk `deal_at` untuk ranking.
7. **Supabase hanya Postgres.** Authentication milik aplikasi (Better Auth).
8. **Session pooler port 5432**, bukan transaction pooler 6543.
9. **Salt & Sour bukan brand.**
10. Satu Admin aktif selalu ada.

---

## 10. Persyaratan non-fungsional

| Aspek | Syarat Phase 1 |
|---|---|
| Perangkat | Browser desktop + HP (layout navigasi bawah di layar sempit) |
| Performa | Layar daftar < 3 detik pada data ratusan baris per brand |
| Bahasa | UI Indonesia; ID tidak dipakai di label |
| Keamanan | Semua mutasi lewat server function + sesi terverifikasi; tidak percaya `userId` dari klien |
| Privasi | Data klien (HP, email lead) hanya untuk user berhak |
| Ketersediaan | Vercel Hobby cukup; cold start boleh beberapa detik |
| Backup | Mengandalkan backup Supabase |
| Audit | `content_activity`, `lead_activity`, `last_updated_by` |

---

## 11. Arsitektur (ringkas untuk teknis)

| Lapisan | Pilihan |
|---|---|
| UI | React 19, TanStack Start, Tailwind v4, bahasa Indonesia |
| Auth | Better Auth, email/password, cookie `__Host-` |
| Data | Postgres (Supabase Session pooler 5432 atau Neon) |
| Preview Grok | PGLite in-memory + 15 akun simulasi |
| Deploy | Vercel, repo GitHub `DKCorp-id/SIM-AMGZ` |
| Env | `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`; `AMG_SIM_SEED=true` hanya jika ingin 15 akun latihan di server itu |

Jangan: Next.js, `@supabase/ssr`, RLS Auth, unggah file ke Storage untuk hasil konten.

---

## 12. Model data (konseptual)

- `companies` — 4 brand, platform JSON, aktif.
- `profiles` — 1 baris per user aplikasi: `role` admin/gm/null + flag editor/kreator/sales + `company_id`.
- `user` / `session` / `account` — milik Better Auth.
- `pillar_setting` — pilar per brand.
- `content` + `content_activity`.
- `lead` + `lead_activity` + `lead_hasil_kerjasama` (1:1).
- `kpi_settings`, `sales_target`, `sales_breakdown`, `ranking_threshold`.
- `access_token` — undangan/reset, hash SHA-256, kedaluwarsa 48 jam.

`user_id` bertipe teks (ID Better Auth), bukan UUID Postgres wajib.

---

## 13. User journey (penerimaan)

### J1 — Hari pertama produksi

1. Admin membuka URL Vercel, form Admin pertama.
2. Isi nama, email, sandi ≥ 8.
3. Masuk ke Pengaturan.
4. (Opsional) Isi data latihan untuk melihat layar terisi.
5. Undang GM + 1 Editor + 1 Kreator + 1 Sales.
6. Salin tautan set sandi, kirim WA.
7. Mereka set sandi, masuk ke layar sesuai peran.

**Sukses:** tidak ada *Belum diundang* untuk Admin; undangan membuka reset-password.

### J2 — Editor → Kreator → Publish

1. Editor buat konten Rencana, assign Kreator.
2. Kreator melihat di Tugas.
3. Video tayang di IG/TikTok.
4. Kreator tempel tautan, Publish.
5. Editor melihat status Publish + tautan di detail (milik sendiri).

**Gagal yang benar:** Publish tanpa tautan ditolak; Editor lain 403.

### J3 — Sales → Deal → Ranking

1. Sales buat lead Baru.
2. Geser Dihubungi → Nego → Deal.
3. Isi hasil kerja sama nilai final.
4. Ranking bulan itu menampilkan sales tersebut; warna sesuai threshold.

### J4 — Bersih data latihan

1. Admin ketuk **Hapus latihan, sisakan Admin**.
2. Konten/lead/user undangan hilang.
3. Admin masih bisa masuk; 4 brand masih ada.

---

## 14. Kriteria penerimaan Phase 1

- [ ] Login email/sandi di URL produksi (bukan papan 15 nama).
- [ ] Admin pertama hanya sekali.
- [ ] Empat brand: Amazing Malang, AME, Mata Malang, Sam Ongis. Tidak ada Salt & Sour.
- [ ] Editor tidak melihat konten editor lain.
- [ ] Kreator hanya tugas assign; Publish wajib URL.
- [ ] Sales hanya lead assign; arsip tidak untuk Deal+.
- [ ] Ranking memakai Deal/Jalan/Selesai + `deal_at` WIB.
- [ ] GM simpan breakdown meski cadangan negatif (warning).
- [ ] Undangan menghasilkan tautan 48 jam.
- [ ] UI Indonesia.
- [ ] Tidak ada upload file hasil konten.
- [ ] Data latihan bisa diisi dan dihapus tanpa menghapus Admin.

---

## 15. Lingkungan

| | Preview (Grok) | Produksi (Vercel) |
|---|---|---|
| Database | PGLite, hilang saat restart | Supabase Postgres |
| Login | Papan 15 akun `@amg.test` | Email kerja |
| Data | Seed penuh | Kosong, lalu Admin + opsional latihan |
| Auth sosial | Broker Grok | Mati |

URL produksi yang dipakai: `https://sim-amgz-dkc-orps.vercel.app` (alias tetap, bukan URL hash Visit).

---

## 16. Phase 2 (backlog, bukan komitmen jadwal)

1. Kirim undangan dan reset sandi lewat email sungguhan.
2. Notifikasi tugas baru ke Kreator / lead baru.
3. Reminder tindak lanjut CRM.
4. Tarik metrik sosmed (manual CSV dulu, API kemudian).
5. Kalender konten per bulan.
6. Lampiran proposal (file) di lead — terpisah dari hasil konten.
7. Export ranking / CRM ke spreadsheet.

---

## 17. Glosarium

| Istilah | Arti |
|---|---|
| Brand / company | Satu dari 4 entitas konten AMG |
| Pilar | Kategori editorial per brand |
| Assign | Menunjuk Kreator atau Sales sebagai pemilik baris |
| Publish | Status konten setelah tautan hasil ditempel |
| Deal | Tahap CRM saat klien setuju; mulai dihitung ranking |
| Platform (peran) | Admin atau GM, lintas brand |
| Session pooler | Koneksi Postgres port 5432 untuk Better Auth |
| Data latihan | Baris contoh bertanda `[SIMULASI]`, boleh dihapus |

---

## 18. Riwayat dokumen

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 18 Sep 2026 | PRD lengkap Phase 1 diselaraskan dengan kode, skema, dan keputusan brand (Sam Ongis, bukan Salt & Sour) |

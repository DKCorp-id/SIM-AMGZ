const STEPS = [
  {
    n: "1",
    title: "Kerjakan dulu di HP, bukan di sini",
    body: "Rekam atau edit video seperti biasa. Lalu unggah ke Instagram, TikTok, Facebook, atau YouTube dari aplikasi itu. AMG Ops tidak menyimpan file video. Jangan cari tombol “pilih file dari galeri” — memang tidak ada.",
  },
  {
    n: "2",
    title: "Tunggu sampai postingan benar-benar tayang",
    body: "Buka aplikasi sosmed. Pastikan video sudah muncul di akun brand, bisa dibuka orang lain, dan bukan draf di HP Anda.",
  },
  {
    n: "3",
    title: "Salin tautan postingan",
    body: "Buka postingan itu → ketuk Bagikan (ikon panah atau kertas terbang) → pilih Salin tautan. Jangan salin tautan profil akun. Yang dibutuhkan tautan satu video/postingan.",
  },
  {
    n: "4",
    title: "Kembali ke Tugas Konten",
    body: "Di AMG Ops, buka menu Tugas Konten. Ketuk tugas yang baru saja Anda tayangkan, bukan tugas lain.",
  },
  {
    n: "5",
    title: "Ubah status menjadi Publish",
    body: "Di kotak status, pilih Publish. Kotak tautan baru muncul setelah itu. Status Draft artinya masih dikerjakan. Publish artinya sudah tayang dan tautannya diisi.",
  },
  {
    n: "6",
    title: "Tempel tautan, lalu Simpan",
    body: "Tempel tautan di kotak Link hasil. Cek dimulai dengan https://. Ketuk Simpan. Kalau berhasil, tugas itu bertanda Publish dan tautannya bisa diklik.",
  },
];

export function PanduanUnggah({ compact }: { compact?: boolean }) {
  return (
    <section className={compact ? "space-y-4" : "space-y-5"}>
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Untuk yang baru pertama kali</p>
        <h2 className="mt-1 font-display text-2xl tracking-tight">Cara unggah hasil konten</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          “Unggah” di sini artinya memberitahu kantor bahwa video sudah tayang, dengan menempel tautan. Bukan mengirim file dari galeri HP.
        </p>
      </div>

      <ol className="space-y-3">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-3 rounded-[16px] border border-line bg-bg px-4 py-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-medium text-accent-fg">
              {s.n}
            </span>
            <div>
              <p className="text-sm font-medium text-fg">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[16px] border border-line bg-bg-subtle px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-moss">Contoh tautan yang benar</p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-fg">
            <li>https://www.instagram.com/reel/……/</li>
            <li>https://www.tiktok.com/@akun/video/……</li>
            <li>https://www.facebook.com/……/posts/……</li>
            <li>https://youtu.be/……</li>
          </ul>
        </div>
        <div className="rounded-[16px] border border-line bg-bg-subtle px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-danger">Jangan tempel ini</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li>File video atau foto dari galeri</li>
            <li>Tautan profil (instagram.com/namaakun)</li>
            <li>Screenshot, PDF, atau Google Drive</li>
            <li>Tautan yang masih draf / hanya terlihat Anda</li>
          </ul>
        </div>
      </div>

      <p className="text-sm text-muted">
        Salah tempel? Buka tugas itu lagi, tempel tautan yang benar, Simpan. Status Publish boleh diubah mundur ke Draft jika belum jadi.
      </p>
    </section>
  );
}

export function LoginHowTo() {
  return (
    <section className="rounded-[24px] border border-line bg-bg-elev p-5 sm:p-6">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Baca ini dulu — 1 menit</p>
      <h2 className="mt-1 font-display text-2xl tracking-tight">Cara coba, tanpa daftar</h2>
      <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
        <li>
          <span className="font-medium text-fg">1. Tunggu tulisan “Data latihan siap”.</span> Sistem mengisi dulu 15 orang, konten, CRM, dan target. Jangan ketuk nama sebelum itu.
        </li>
        <li>
          <span className="font-medium text-fg">2. Ketuk satu nama di papan bawah.</span> Tidak perlu mengetik kata sandi. Itu dunia latihan, bukan akun kerja sungguhan.
        </li>
        <li>
          <span className="font-medium text-fg">3. Mau latihan unggah hasil video?</span> Ketuk{" "}
          <span className="text-fg">Kiki Kreator</span> (Amazing Malang). Nanti ada tugas siap dikerjakan dan satu contoh yang sudah Publish.
        </li>
        <li>
          <span className="font-medium text-fg">4. Ganti orang</span> lewat tombol “Simulasi akun” di kiri bawah (HP: kanan atas).
        </li>
      </ol>
      <p className="mt-4 text-sm text-muted">
        Setelah masuk, buka menu <span className="text-fg">Panduan</span> kapan saja. Penjelasan unggah ada di situ, langkah demi langkah.
      </p>
    </section>
  );
}

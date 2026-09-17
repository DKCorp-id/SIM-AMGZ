export function PanduanPasang() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Untuk pemilik aplikasi</p>
        <h2 className="mt-1 font-display text-2xl tracking-tight">Pasang ke internet (Supabase + Vercel)</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Analogi: <span className="text-fg">Supabase</span> adalah lemari data (orang, konten, CRM).{" "}
          <span className="text-fg">Vercel</span> adalah alamat website yang dibuka karyawan. Keduanya harus
          disambungkan. Login <span className="text-fg">bukan</span> milik Supabase — aplikasi ini punya sistem
          masuk sendiri. Di Supabase kita hanya memakai database.
        </p>
      </div>

      <div className="rounded-[16px] border border-line bg-bg-subtle px-4 py-3 text-sm leading-relaxed text-muted">
        Dua jalan. <span className="text-fg">A.</span> Tombol Publish di Grok — paling mudah, database Neon otomatis,
        tanpa Supabase. <span className="text-fg">B.</span> Akun Vercel + Supabase Anda sendiri — langkah di bawah.
        Pilih satu. Jangan campur keduanya untuk data yang sama.
      </div>

      <Block n="0" title="Siapkan dulu">
        <ul className="list-disc space-y-1 pl-5">
          <li>Laptop + browser (Chrome / Edge / Safari).</li>
          <li>Email kerja atau Gmail. Paket gratis cukup.</li>
          <li>
            Kode AMG Ops sudah ada di GitHub. Vercel mengambil kode dari situ. Kalau belum, buat akun GitHub, repo
            baru, unggah folder project (tanpa folder node_modules).
          </li>
        </ul>
      </Block>

      <Block n="1" title="Buat project Supabase">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Buka{" "}
            <a className="text-fg underline" href="https://supabase.com" target="_blank" rel="noreferrer">
              supabase.com
            </a>
            , ketuk Start your project, masuk dengan GitHub atau email.
          </li>
          <li>Ketuk New project. Nama bebas, contoh amg-ops.</li>
          <li>Database password: buat yang kuat, simpan di catatan pribadi. Ini bukan sandi login karyawan.</li>
          <li>Region: pilih yang dekat Asia (Singapore jika ada). Create new project. Tunggu ~2 menit sampai hijau.</li>
          <li>
            Jangan nyalakan menu Authentication untuk aplikasi ini. Jangan buat user di sana. Login AMG Ops hidup di
            tabel sendiri.
          </li>
        </ol>
      </Block>

      <Block n="2" title="Salin alamat lemari (DATABASE_URL)">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Di project Supabase, ketuk Connect di bagian atas. Jendela “Connect to your project” terbuka.</li>
          <li>
            Jangan diam di tab <span className="text-fg">Framework</span> (Next.js, npm install, kunci publishable).
            Aplikasi ini tidak memakai itu.
          </li>
          <li>
            Ketuk tab ketiga: <span className="text-fg">Direct — Connection string</span>.
          </li>
          <li>
            Di situ pilih <span className="text-fg">Session pooler</span> (kadang tertulis Type / Method). Port harus{" "}
            <span className="text-fg">5432</span>. Bukan Transaction pooler, bukan port 6543.
          </li>
          <li>
            Salin URI. Bentuknya kira-kira:
            <code className="mt-2 block break-all rounded-[10px] bg-bg px-3 py-2 font-mono text-xs text-fg">
              postgresql://postgres.xxxx:SANDI@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
            </code>
          </li>
          <li>Ganti [YOUR-PASSWORD] dengan sandi database. Karakter aneh (# @ % spasi) harus di-encode.</li>
        </ol>
        <p className="mt-3 text-sm text-warn">
          Salah port 6543 → login gagal. Aplikasi ini memakai prepared statement; session pooler 5432 yang benar.
        </p>
      </Block>

      <Block n="3" title="Buat project Vercel">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Buka{" "}
            <a className="text-fg underline" href="https://vercel.com" target="_blank" rel="noreferrer">
              vercel.com
            </a>
            , masuk dengan GitHub.
          </li>
          <li>Add New → Project → pilih repo AMG Ops → Import.</li>
          <li>Framework biarkan terdeteksi. Build Command tetap npm run build. Jangan diubah.</li>
          <li>Jangan ketuk Deploy dulu. Isi Environment Variables lebih dulu (langkah 4).</li>
        </ol>
      </Block>

      <Block n="4" title="Isi tiga variabel di Vercel">
        <p>
          Project → Settings → Environment Variables. Centang Production, Preview, dan Development. Simpan satu per
          satu.
        </p>
        <div className="mt-3 overflow-x-auto rounded-[12px] border border-line">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-bg-subtle text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Nama</th>
                <th className="px-3 py-2">Isi</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line">
                <td className="px-3 py-2 font-mono text-xs">DATABASE_URL</td>
                <td className="px-3 py-2 text-muted">URI Session pooler yang baru disalin</td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-3 py-2 font-mono text-xs">BETTER_AUTH_URL</td>
                <td className="px-3 py-2 text-muted">
                  Alamat website, tanpa garis miring di akhir. Setelah deploy pertama: https://NAMA.vercel.app
                </td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-3 py-2 font-mono text-xs">BETTER_AUTH_SECRET</td>
                <td className="px-3 py-2 text-muted">
                  String acak ≥ 32 karakter. Buka generate-secret.vercel.app/32 lalu tempel.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          Jangan isi AMG_SIM_SEED di production sungguhan (itu 15 akun latihan). Jangan pernah menaruh DATABASE_URL
          dengan awalan VITE_ — itu bocor ke browser.
        </p>
      </Block>

      <Block n="5" title="Deploy, lalu kunci alamat">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Deployments → Redeploy, atau ketuk Deploy.</li>
          <li>Tunggu sampai status Ready. Kalau gagal, buka log: cari migrate atau DATABASE_URL.</li>
          <li>
            Salin URL (contoh https://amg-ops.vercel.app). Tempel ke BETTER_AUTH_URL, simpan, Redeploy sekali lagi.
            Login tidak jalan jika alamat ini salah atau ada garis miring di belakang.
          </li>
        </ol>
        <p className="mt-3 text-sm text-muted">
          Saat build, Vercel menjalankan npm run build. File migrations/*.sql masuk ke Supabase otomatis (4 brand,
          pilar, tabel login). Anda tidak perlu menempel SQL di SQL Editor, kecuali deploy gagal.
        </p>
      </Block>

      <Block n="6" title="Admin pertama">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Buka alamat Vercel. Harus muncul form Admin pertama (bukan papan 15 nama).</li>
          <li>Isi nama, email kerja, kata sandi minimal 8 karakter. Itu akun Anda, bukan akun latihan.</li>
          <li>Masuk → Kelola User → Undang GM, editor, kreator, sales. Salin tautan set sandi, kirim lewat WA/email.</li>
          <li>Mereka buka tautan, buat sandi, lalu masuk. Tidak ada daftar publik.</li>
        </ol>
      </Block>

      <Block n="7" title="Kalau error">
        <ul className="list-disc space-y-2 pl-5">
          <li>Halaman login kosong / 500: DATABASE_URL salah, atau port 6543.</li>
          <li>“Invalid origin”: BETTER_AUTH_URL tidak sama persis dengan URL di bilah alamat.</li>
          <li>Form Admin pertama tidak muncul: sudah ada admin di database, atau migrasi belum jalan.</li>
          <li>Sandi database baru di-reset: tunggu 1–2 menit, lalu Redeploy.</li>
        </ul>
      </Block>
    </section>
  );
}

function Block({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-[16px] border border-line bg-bg-elev px-4 py-4 sm:px-5">
      <h3 className="text-sm font-medium text-fg">
        <span className="mr-2 font-mono text-muted">{n}.</span>
        {title}
      </h3>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted">{children}</div>
    </article>
  );
}

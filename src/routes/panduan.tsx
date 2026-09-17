import { createFileRoute, Link } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AppShell, LoadingScreen, PageTitle } from "@/components/app-shell";
import { PanduanUnggah } from "@/components/panduan-unggah";
import { PanduanPasang } from "@/components/panduan-pasang";
import { useActorGate } from "@/lib/amg/use-actor";
import { SIM_UI } from "@/lib/amg/runtime";

export const Route = createFileRoute("/panduan")({ component: PanduanPage });

function PanduanPage() {
  const { actor, ready, user, isPending } = useActorGate();

  if (isPending || !ready) return <LoadingScreen />;
  if (!user) return <RedirectToSignIn />;
  if (!actor) return <LoadingScreen label="Mengalihkan…" />;

  return (
    <AppShell actor={actor}>
      <PageTitle kicker="Bantuan" title="Panduan pemula" />
      <div className="space-y-10">
        <section className="max-w-2xl space-y-3 text-sm leading-relaxed text-muted">
          <p>
            AMG Ops adalah papan kerja internal Amazing Malang Group. Bukan Instagram. Di sini Editor merencanakan,
            Kreator menandai video yang sudah tayang, Sales menggeser prospek, Admin mengatur orang.
          </p>
          {SIM_UI ? (
            <p>
              Yang Anda lihat sekarang dunia latihan. Nama, konten, dan angka sudah diisi. Boleh diklik rusak — data
              ulang saat aplikasi dihidupkan lagi.
            </p>
          ) : null}
        </section>

        {actor.isKreator ? (
          <div className="rounded-[24px] border border-accent/40 bg-bg-elev p-5 sm:p-6">
            <PanduanUnggah />
            <p className="mt-5 text-sm">
              <Link to="/tugas" className="text-fg underline underline-offset-2">
                Buka Tugas Konten
              </Link>{" "}
              untuk praktik menempel tautan.
            </p>
          </div>
        ) : (
          <PanduanUnggah />
        )}

        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">Kalau Anda Editor</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>Buka Konten Saya.</li>
            <li>Ketuk Buat konten.</li>
            <li>Isi tanggal tayang, platform, format, pilar, dan tema (judul singkat).</li>
            <li>Pilih kreator di Assign. Kalau belum yakin, boleh dikosongkan selama status masih Rencana.</li>
            <li>Simpan. Kreator akan melihatnya di Tugas Konten.</li>
            <li>Anda tidak mengubah status jadi Publish — itu kerjaan Kreator setelah video tayang.</li>
          </ol>
          <p className="text-sm text-muted">
            Editor satu brand tidak melihat rencana editor lain. Itu disengaja. Coba Eka lalu Raka di simulasi.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">Kalau Anda Sales</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>Buka CRM Pipeline. Setiap kolom adalah tahap: Baru → Dihubungi → Nego → Deal → Jalan → Selesai.</li>
            <li>Ketuk kartu untuk isi catatan telepon / WA / meeting.</li>
            <li>Geser ke Deal hanya setelah klien setuju. Nilai deal masuk ranking bulan ini.</li>
            <li>Arsip hanya untuk Baru, Dihubungi, atau Nego. Deal yang sudah jalan tidak boleh diarsip.</li>
          </ol>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">Kalau Anda Admin atau GM</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>Undang orang dari Kelola User. Mereka tidak daftar sendiri.</li>
            <li>Salin tautan set kata sandi, kirim ke email kerja mereka (WhatsApp boleh, asal tautannya utuh).</li>
            <li>Admin mengatur pilar, target, dan ambang ranking di Setting Admin.</li>
            <li>GM membagi target ke masing-masing sales di Breakdown. Cadangan merah = warning, tetap boleh simpan.</li>
            <li>Konten dan CRM untuk Anda tinggal dilihat, bukan diisi.</li>
          </ol>
        </section>

        {SIM_UI ? (
          <section className="rounded-[20px] border border-line bg-bg-subtle px-5 py-4 text-sm leading-relaxed text-muted">
            <p className="font-medium text-fg">Saran klik pertama di simulasi</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Kiki Kreator — latihan unggah tautan.</li>
              <li>Eka Editor lalu Raka Editor — lihat isolasi konten.</li>
              <li>Sari Sales — papan 6 tahap CRM sudah terisi.</li>
              <li>Andi Admin / Gita GM — pengaturan dan ranking.</li>
            </ul>
          </section>
        ) : null}

        {actor.isAdmin || actor.isGm || SIM_UI ? <PanduanPasang /> : null}
      </div>
    </AppShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui";

export const Route = createFileRoute("/daftar")({ component: Daftar });

function Daftar() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-5 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-line bg-bg-elev p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">AMG Ops</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Undang saja</h1>
        <p className="mt-3 text-sm text-muted">Pendaftaran publik ditutup. Minta Admin atau GM mengirim undangan ke email kerja Anda.</p>
        <Link to="/login" className="mt-6 inline-block">
          <Button>Ke halaman masuk</Button>
        </Link>
      </div>
    </main>
  );
}
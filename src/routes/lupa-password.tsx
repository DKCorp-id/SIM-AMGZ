import { createFileRoute, Link } from "@tanstack/react-router";
import { requestPasswordReset } from "@/lib/amg/actions";
import { Button, Field, Input } from "@/components/ui";
import { useState } from "react";

export const Route = createFileRoute("/lupa-password")({ component: LupaPassword });

function LupaPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await requestPasswordReset({ data: { email } });
      setDone(true);
      if (res.setupPath) setLink(res.setupPath);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-5 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-line bg-bg-elev p-8">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">AMG Ops</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Lupa kata sandi</h1>
        <p className="mt-2 text-sm text-muted">Masukkan email kerja. Jika terdaftar, tautan reset akan dibuat.</p>
        {done ? (
          <div className="mt-6 space-y-3 text-sm">
            <p>
              Jika email terdaftar, minta Admin mengirim tautan reset dari Kelola User. Kata sandi tidak pernah
              ditampilkan.
            </p>
            {link ? (
              <p className="rounded-[12px] bg-bg-subtle px-3 py-2 text-xs text-muted">
                Preview (kirim tautan ini ke user):{" "}
                <a href={link} className="text-fg underline">
                  Set kata sandi
                </a>
              </p>
            ) : null}
          </div>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={onSubmit}>
            <Field label="Email">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Mengirim…" : "Kirim tautan reset"}
            </Button>
          </form>
        )}
        <p className="mt-5 text-center text-sm text-muted">
          <Link to="/login" className="text-fg underline">
            Kembali masuk
          </Link>
        </p>
      </div>
    </main>
  );
}
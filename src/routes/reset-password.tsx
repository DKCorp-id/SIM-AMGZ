import { createFileRoute, Link } from "@tanstack/react-router";
import { completePasswordReset } from "@/lib/amg/actions";
import { Button, Field, Input } from "@/components/ui";
import { useState } from "react";

export const Route = createFileRoute("/reset-password")({ component: ResetPassword });

function readToken() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

function ResetPassword() {
  const [token] = useState(readToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setErr("Kata sandi tidak sama.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await completePasswordReset({ data: { token, password } });
      setOk(true);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-5 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-line bg-bg-elev p-8">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">AMG Ops</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Set kata sandi</h1>
        {ok ? (
          <p className="mt-4 text-sm text-muted">
            Kata sandi tersimpan.{" "}
            <Link to="/login" className="text-fg underline">
              Masuk
            </Link>
          </p>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={onSubmit}>
            <Field label="Kata sandi baru (min. 8)">
              <Input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Field label="Ulangi">
              <Input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
            {err ? <p className="text-sm text-danger">{err}</p> : null}
            <Button type="submit" className="w-full" disabled={busy || !token}>
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
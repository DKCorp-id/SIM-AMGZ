import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button, Field, Input } from "@/components/ui";
import { SimCastBoard, useSimPick } from "@/components/sim-switch";
import { LoginHowTo } from "@/components/panduan-unggah";
import { SIM_ACCOUNTS, SIM_PASSWORD } from "@/lib/amg/sim-cast";
import { claimFirstAdmin, getSetupState } from "@/lib/amg/actions";
import { SIM_UI } from "@/lib/amg/runtime";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/login")({ component: Login });

function readParam(key: string) {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get(key) ?? undefined;
}

function Login() {
  const { user, isPending } = useCurrentUserState();
  const nav = useNavigate();
  const [sim] = useState(() => readParam("sim"));
  const [nonaktif] = useState(() => readParam("nonaktif"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [more, setMore] = useState(!SIM_UI);
  const [needsFirstAdmin, setNeedsFirstAdmin] = useState(false);
  const { busy, err, pick, ready, retry } = useSimPick();
  const simAccount = SIM_ACCOUNTS.find((a) => a.email === sim);

  useEffect(() => {
    if (SIM_UI) return;
    void getSetupState()
      .then((s) => setNeedsFirstAdmin(s.needsFirstAdmin))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (SIM_UI && sim && user) {
      void authClient.signOut().finally(() => {
        window.location.replace(`${window.location.origin}/login?sim=${encodeURIComponent(sim)}`);
      });
      return;
    }
    if (SIM_UI && sim && !user && simAccount && ready) {
      void authClient.signIn.email({ email: sim, password: SIM_PASSWORD }).then(({ error }) => {
        if (error) {
          setFormErr(error.message ?? "Gagal masuk simulasi.");
          return;
        }
        window.location.replace(`${window.location.origin}/`);
      });
      return;
    }
    if (!sim && user) {
      void nav({ to: "/" });
    }
  }, [isPending, user, sim, simAccount, nav, ready]);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setFormBusy(true);
    setFormErr(null);
    const { error } = await authClient.signIn.email({ email, password });
    setFormBusy(false);
    if (error) setFormErr(error.message ?? "Gagal masuk.");
    else window.location.replace(`${window.location.origin}/`);
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Amazing Malang Group</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">AMG Ops</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {SIM_UI
            ? "Papan kerja 4 brand. Di pratinjau ini, data latihan sudah diisi lengkap. Ketuk nama untuk masuk — tidak perlu kata sandi."
            : "Operasi internal 4 brand. Masuk dengan email kerja. User baru hanya lewat undangan."}
        </p>
        {nonaktif ? <p className="mt-3 text-sm text-danger">Akun nonaktif. Hubungi Admin.</p> : null}

        {simAccount ? (
          <p className="mt-4 text-sm text-muted">
            Masuk sebagai <span className="text-fg">{simAccount.name}</span>…
          </p>
        ) : null}

        {SIM_UI ? (
          <div className="mt-8 space-y-6">
            <LoginHowTo />
            <div className="rounded-[24px] border border-line bg-bg-elev p-4 sm:p-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Papan akun latihan</p>
                  <p className="mt-1 text-sm text-fg">
                    {ready ? "Data latihan siap. Ketuk nama di bawah." : "Sedang mengisi data latihan lengkap…"}
                  </p>
                </div>
                {ready ? (
                  <span className="rounded-full bg-ok/15 px-3 py-1 text-xs text-ok">Siap</span>
                ) : (
                  <span className="rounded-full bg-bg-subtle px-3 py-1 text-xs text-muted">Menyiapkan…</span>
                )}
              </div>
              {ready ? (
                <SimCastBoard busy={busy} onPick={pick} />
              ) : (
                <p className="rounded-[14px] border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
                  Mengisi 15 orang, konten tiap brand, papan CRM, target, dan contoh yang sudah diunggah. Tunggu sebentar.
                </p>
              )}
              {err ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <p className="text-sm text-danger">{err}</p>
                  <Button tone="line" className="h-8" onClick={() => void retry()}>
                    Coba isi ulang
                  </Button>
                </div>
              ) : null}
              {formErr ? <p className="mt-4 text-sm text-danger">{formErr}</p> : null}
            </div>
          </div>
        ) : null}

        {!SIM_UI && needsFirstAdmin ? <FirstAdminCard /> : null}

        {SIM_UI ? (
          <button type="button" className="mt-6 text-sm text-muted underline" onClick={() => setMore((v) => !v)}>
            {more ? "Sembunyikan masuk biasa" : "Masuk dengan email"}
          </button>
        ) : null}

        {more && !needsFirstAdmin ? (
          <div className={`${SIM_UI ? "mt-4" : "mt-8"} max-w-md rounded-[24px] border border-line bg-bg-elev p-6`}>
            {!SIM_UI ? (
              <>
                <h2 className="font-display text-2xl">Masuk</h2>
                <p className="mt-1 mb-4 text-sm text-muted">Email dan kata sandi undangan.</p>
              </>
            ) : null}
            {SIM_UI && authEnabled ? (
              <div className="space-y-2">
                {GROK_PROVIDERS.map((p) => (
                  <Button
                    key={p.providerId}
                    type="button"
                    tone="line"
                    className="w-full"
                    onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                  >
                    Lanjut dengan {p.label}
                  </Button>
                ))}
              </div>
            ) : null}
            <form className="mt-4 space-y-3" onSubmit={onEmail}>
              <Field label="Email">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Kata sandi">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              {formErr ? <p className="text-sm text-danger">{formErr}</p> : null}
              <Button type="submit" className="w-full" disabled={formBusy}>
                {formBusy ? "Memproses…" : "Masuk"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted">
              <Link to="/lupa-password" className="text-fg underline">
                Lupa kata sandi
              </Link>
              {" · "}
              <Link to="/daftar" className="text-fg underline">
                Belum punya akun
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function FirstAdminCard() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setErr("Kata sandi tidak sama.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const signed = await authClient.signUp.email({ email, password, name });
      if (signed.error) {
        const existing = await authClient.signIn.email({ email, password });
        if (existing.error) {
          setErr(signed.error.message ?? "Gagal membuat akun Admin.");
          return;
        }
      }
      await claimFirstAdmin({ data: { name } });
      window.location.replace(`${window.location.origin}/`);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Gagal setup.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 max-w-md rounded-[24px] border border-line bg-bg-elev p-6">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Setup awal</p>
      <h2 className="mt-1 font-display text-2xl">Admin pertama</h2>
      <p className="mt-2 text-sm text-muted">
        Database masih kosong. Akun ini menjadi Admin platform, lalu mengundang GM dan user brand.
      </p>
      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        <Field label="Nama">
          <Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email kerja">
          <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Kata sandi (min. 8)">
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Ulangi kata sandi">
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        {err ? <p className="text-sm text-danger">{err}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Menyimpan…" : "Buat Admin pertama"}
        </Button>
      </form>
    </div>
  );
}

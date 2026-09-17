import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { ensureSimWorld } from "@/lib/amg/actions";
import { SIM_ACCOUNTS, SIM_GROUPS, SIM_KIND_LABEL, type SimAccount } from "@/lib/amg/sim-cast";
import { SIM_UI } from "@/lib/amg/runtime";
import { Button, Modal, cn } from "@/components/ui";

export function simLoginHref(email: string) {
  return `${window.location.origin}/login?sim=${encodeURIComponent(email)}`;
}

export function SimCastBoard({
  currentEmail,
  busy,
  onPick,
}: {
  currentEmail?: string | null;
  busy?: string | null;
  onPick: (acc: SimAccount) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {SIM_GROUPS.map((g) => (
        <section key={g.label}>
          <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">{g.label}</p>
          <div className="space-y-1.5">
            {SIM_ACCOUNTS.filter((a) => a.companyId === g.companyId).map((acc) => {
              const active = currentEmail === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => onPick(acc)}
                  className={cn(
                    "min-h-11 w-full rounded-[12px] border px-3 py-2 text-left",
                    active ? "border-accent bg-bg-subtle" : "border-line bg-bg hover:bg-bg-subtle",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{acc.name}</span>
                    <span className="text-[11px] text-muted">{SIM_KIND_LABEL[acc.kind]}</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-faint">{acc.email}</span>
                  {acc.hint ? <span className="mt-1 block text-[11px] text-warn">{acc.hint}</span> : null}
                  {busy === acc.email ? <span className="mt-1 block text-[11px] text-muted">Masuk…</span> : null}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function useSimPick() {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(!SIM_UI);

  useEffect(() => {
    if (!SIM_UI) return;
    void ensureSimWorld()
      .then(() => setReady(true))
      .catch((e) => {
        setErr(e instanceof Error ? e.message : "Gagal menyiapkan data latihan.");
        setReady(false);
      });
  }, []);

  async function pick(acc: SimAccount) {
    if (!ready) return;
    setBusy(acc.email);
    setErr(null);
    try {
      await ensureSimWorld();
      try {
        await authClient.signOut();
      } catch {
        /* ignore */
      }
      window.location.replace(simLoginHref(acc.email));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal ganti akun.");
      setBusy(null);
    }
  }

  async function retry() {
    setErr(null);
    setReady(false);
    try {
      await ensureSimWorld();
      setReady(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyiapkan data latihan.");
    }
  }

  return { busy, err, pick, ready, retry };
}

export function SimSwitch({ currentEmail, compact }: { currentEmail?: string | null; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { busy, err, pick } = useSimPick();

  return (
    <>
      <Button
        type="button"
        tone="line"
        className={cn(compact ? "h-8 px-3 text-xs" : "w-full")}
        onClick={() => setOpen(true)}
      >
        Simulasi akun
      </Button>
      <Modal open={open} wide title="Ganti akun simulasi" onClose={() => setOpen(false)}>
        <p className="mb-4 text-sm text-muted">
          Data latihan sudah diisi lengkap. Ketuk nama. Tidak perlu kata sandi. Untuk latihan unggah, pilih Kiki Kreator.
        </p>
        <SimCastBoard currentEmail={currentEmail} busy={busy} onPick={pick} />
        {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
      </Modal>
    </>
  );
}

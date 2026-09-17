import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { claimFirstAdmin, getBootstrap, getSetupState } from "@/lib/amg/actions";
import { LoadingScreen } from "@/components/app-shell";
import { Button, Field, Input } from "@/components/ui";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function Onboarding() {
  const { user, isPending } = useCurrentUserState();
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [needsAdmin, setNeedsAdmin] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void Promise.all([getBootstrap(), getSetupState()])
      .then(([b, s]) => {
        if (b.ok) void nav({ to: b.landing });
        else {
          setNeedsAdmin(s.needsFirstAdmin);
          setName(user.displayName ?? "");
          if ("error" in b && b.error && b.error !== "NO_PROFILE") setErr(b.error);
          setChecking(false);
        }
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : "Gagal memuat akses.");
        setName(user.displayName ?? "");
        setNeedsAdmin(true);
        setChecking(false);
      });
  }, [user, nav]);

  if (isPending || checking) return <LoadingScreen />;
  if (!user) return <RedirectToSignIn />;

  async function claim() {
    setBusy(true);
    setErr(null);
    try {
      await claimFirstAdmin({ data: { name: name.trim() || user?.displayName || "Admin" } });
      window.location.replace(`${window.location.origin}/`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-5 py-10">
      <div className="w-full max-w-md space-y-4 rounded-[28px] border border-line bg-bg-elev p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Akses</p>
        <h1 className="font-display text-3xl">{needsAdmin ? "Admin pertama" : "Belum diundang"}</h1>
        <p className="text-sm text-muted">
          {needsAdmin
            ? "Akun ini akan menjadi Admin platform AMG Ops. Ketuk tombol di bawah, lalu Anda bisa mengundang tim."
            : "Akun ini belum punya peran. Minta Admin mengirim undangan, lalu set kata sandi dari tautan tersebut."}
        </p>
        {needsAdmin ? (
          <>
            <div className="text-left">
              <Field label="Nama">
                <Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            </div>
            {err ? <p className="text-sm text-danger">{err}</p> : null}
            <Button className="w-full" disabled={busy} onClick={() => void claim()}>
              {busy ? "Menyimpan…" : "Masuk sebagai Admin"}
            </Button>
          </>
        ) : (
          <>
            {err ? <p className="text-sm text-danger">{err}</p> : null}
          </>
        )}
        <div className="flex justify-center">
          <UserButton />
        </div>
      </div>
    </main>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useActorGate } from "@/lib/amg/use-actor";
import { LoadingScreen } from "@/components/app-shell";
import { landingPath } from "@/lib/amg/types";
import { useEffect } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { isPending, user, actor, ready, blocked } = useActorGate();
  const nav = useNavigate();

  useEffect(() => {
    if (ready && actor) void nav({ to: landingPath(actor) });
  }, [ready, actor, nav]);

  if (isPending || !ready) return <LoadingScreen />;
  if (!user) return <RedirectToSignIn />;
  if (blocked === "inactive") {
    return (
      <main className="grid min-h-screen place-items-center bg-bg px-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl">Akun nonaktif</h1>
          <p className="mt-2 text-muted">Hubungi Admin untuk mengaktifkan kembali.</p>
          <div className="mt-6 flex justify-center">
            <UserButton />
          </div>
        </div>
      </main>
    );
  }
  return <LoadingScreen label="Mengalihkan…" />;
}

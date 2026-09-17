import { Link, useRouterState } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { canSeeNav, type Profile } from "@/lib/amg/types";
import { SimSwitch } from "@/components/sim-switch";
import { SIM_UI } from "@/lib/amg/runtime";
import { cn } from "./ui";

const NAV = [
  { to: "/konten", key: "konten", label: "Konten Saya" },
  { to: "/tugas", key: "tugas", label: "Tugas Konten" },
  { to: "/crm", key: "crm", label: "CRM Pipeline" },
  { to: "/breakdown", key: "breakdown", label: "Breakdown" },
  { to: "/settings", key: "settings", label: "Setting Admin" },
  { to: "/users", key: "users", label: "Kelola User" },
  { to: "/ranking", key: "ranking", label: "Ranking Sales" },
  { to: "/panduan", key: "panduan", label: "Panduan" },
] as const;

export function AppShell({ actor, children }: { actor: Profile; children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV.filter((n) => canSeeNav(actor, n.key));
  const roleBits = [
    actor.role === "admin" ? "Admin" : null,
    actor.role === "gm" ? "GM" : null,
    actor.isEditor ? "Editor" : null,
    actor.isKreator ? "Kreator" : null,
    actor.isSales ? "Sales" : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-bg-elev md:flex">
        <div className="px-5 py-6">
          <p className="font-display text-2xl leading-none tracking-tight">AMG</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted">Internal Ops</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {items.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "rounded-[10px] px-3 py-2 text-sm",
                pathname === n.to ? "bg-bg-subtle text-fg" : "text-muted hover:bg-bg-subtle hover:text-fg",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line px-4 py-4">
          <p className="truncate text-xs text-muted">{actor.companyName ?? "Lintas brand"}</p>
          <p className="mt-0.5 text-[11px] text-faint">{roleBits.join(" · ")}</p>
          <div className="mt-3 space-y-2">
            {SIM_UI ? <SimSwitch currentEmail={actor.email} compact /> : null}
            <UserButton />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur md:hidden">
        <p className="font-display text-lg">AMG</p>
        <div className="flex items-center gap-2">
          {SIM_UI ? <SimSwitch currentEmail={actor.email} compact /> : null}
          <UserButton />
        </div>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 md:hidden">
        {items.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs",
              pathname === n.to ? "bg-accent text-accent-fg" : "bg-bg-subtle text-muted",
            )}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <main className="md:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>
    </div>
  );
}

export function PageTitle({ kicker, title, action }: { kicker: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">{kicker}</p>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function LoadingScreen({ label = "Memuat AMG Ops…" }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-bg">
      <p className="text-muted">{label}</p>
    </div>
  );
}

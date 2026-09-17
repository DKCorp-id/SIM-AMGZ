import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AppShell, LoadingScreen, PageTitle } from "@/components/app-shell";
import { ForbiddenPage, isForbidden } from "@/components/forbidden";
import { Badge } from "@/components/ui";
import { useActorGate } from "@/lib/amg/use-actor";
import { getContentById } from "@/lib/amg/actions";
import { CONTENT_STATUS_LABEL, PLATFORM_LABEL } from "@/lib/amg/constants";
import { formatDate } from "@/lib/amg/format";
import type { ContentRow } from "@/lib/amg/types";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/konten/$id")({ component: KontenDetail });

function KontenDetail() {
  const { id } = Route.useParams();
  const { actor, ready, user, isPending } = useActorGate();
  const nav = useNavigate();
  const [row, setRow] = useState<ContentRow | null>(null);
  const [acts, setActs] = useState<Array<{ id: string; action: string; old_value: string | null; new_value: string | null; notes: string | null; created_at: string; user_name: string }>>([]);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!ready || !actor) return;
    void getContentById({ data: { id } })
      .then((d) => {
        setRow(d.content);
        setActs(d.activities);
      })
      .catch((e) => {
        if (isForbidden(e)) setForbidden(true);
        else void nav({ to: "/konten" });
      });
  }, [ready, actor, id, nav]);

  if (isPending || !ready) return <LoadingScreen />;
  if (!user) return <RedirectToSignIn />;
  if (!actor) return <LoadingScreen label="Mengalihkan…" />;
  if (forbidden) {
    return (
      <AppShell actor={actor}>
        <ForbiddenPage />
      </AppShell>
    );
  }
  if (!row) return <LoadingScreen />;

  return (
    <AppShell actor={actor}>
      <PageTitle kicker={row.companyName} title={row.tema} />
      <div className="flex flex-wrap gap-2 text-sm text-muted">
        <Badge>{CONTENT_STATUS_LABEL[row.status]}</Badge>
        <span>
          {PLATFORM_LABEL[row.platform]} · {row.format}
        </span>
        <span>Tayang {formatDate(row.tanggalTayang)}</span>
        <span>Pilar {row.pilarName}</span>
      </div>
      <p className="mt-4 text-sm">
        Editor {row.createdByName} · Kreator {row.assignedName ?? "belum di-assign"}
      </p>
      {row.catatan ? <p className="mt-4 rounded-[16px] bg-bg-subtle px-4 py-3 text-sm">{row.catatan}</p> : null}
      {row.linkHasil ? (
        <p className="mt-3 text-sm">
          Hasil:{" "}
          <a href={row.linkHasil} className="underline" target="_blank" rel="noreferrer">
            {row.linkHasil}
          </a>
        </p>
      ) : null}
      <h2 className="mt-8 text-xs uppercase tracking-wide text-muted">Jejak</h2>
      <div className="mt-2 space-y-3">
        {acts.map((a) => (
          <div key={a.id} className="border-b border-line pb-3 text-sm">
            <p className="text-xs text-muted">
              {a.action} · {a.user_name} · {formatDate(a.created_at)}
            </p>
            <p>
              {[a.old_value, a.new_value].filter(Boolean).join(" → ")} {a.notes ?? ""}
            </p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AppShell, LoadingScreen, PageTitle } from "@/components/app-shell";
import { Empty, Select } from "@/components/ui";
import { useActorGate } from "@/lib/amg/use-actor";
import { getRanking } from "@/lib/amg/actions";
import { currentYearMonth } from "@/lib/amg/constants";
import { formatRpCompact } from "@/lib/amg/format";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/ranking")({ component: RankingPage });

function colorFor(total: number, green: number, orange: number) {
  if (total >= green) return "text-ok";
  if (total >= orange) return "text-warn";
  return "text-danger";
}

function RankingPage() {
  const { actor, ready, user, isPending } = useActorGate();
  const [ym, setYm] = useState(currentYearMonth());
  const [pack, setPack] = useState<Awaited<ReturnType<typeof getRanking>> | null>(null);

  useEffect(() => {
    if (ready && actor) void getRanking({ data: { yearMonth: ym } }).then(setPack);
  }, [ready, actor, ym]);

  if (isPending || !ready) return <LoadingScreen />;
  if (!user) return <RedirectToSignIn />;
  if (!actor) return <LoadingScreen label="Mengalihkan…" />;
  if (!actor.isPlatform && !actor.isSales) {
    return (
      <AppShell actor={actor}>
        <p className="text-muted">Tidak berhak.</p>
      </AppShell>
    );
  }

  return (
    <AppShell actor={actor}>
      <PageTitle
        kicker="Performa"
        title="Ranking Sales"
        action={
          <Select value={ym} onChange={(e) => setYm(e.target.value)} className="w-40">
            {[-1, 0, 1].map((d) => {
              const [y, m] = currentYearMonth().split("-").map(Number);
              const dt = new Date(y, m - 1 + d, 1);
              const v = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
              return (
                <option key={v} value={v}>
                  {v}
                </option>
              );
            })}
          </Select>
        }
      />
      <div className="grid gap-4">
        {pack?.cards.map((card) => (
          <section key={card.company.id} className="rounded-[20px] border border-line p-5">
            <h2 className="font-display text-2xl">{card.company.name}</h2>
            {card.rows.length === 0 ? (
              <Empty title="Belum ada Sales di brand ini" />
            ) : (
              <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr>
                    <th className="py-2">#</th>
                    <th>Nama</th>
                    <th>Total deal</th>
                    <th>Jumlah</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {card.rows.map((r, i) => (
                    <tr key={r.userId} className="border-t border-line">
                      <td className="py-2 tabular-nums">{i + 1}</td>
                      <td>
                        {r.name}
                        {r.isMe ? <span className="ml-2 text-xs text-muted">Anda</span> : null}
                      </td>
                      <td className={`tabular-nums ${colorFor(r.total, card.greenMin, card.orangeMin)}`}>
                        {formatRpCompact(r.total)}
                      </td>
                      <td className="tabular-nums">{r.count}</td>
                      <td className="text-muted">{r.target != null ? formatRpCompact(r.target) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
            <p className="mt-3 text-xs text-muted">
              Hijau ≥ {formatRpCompact(card.greenMin)} · Oranye ≥ {formatRpCompact(card.orangeMin)} · merah di bawah itu
            </p>
          </section>
        ))}
      </div>
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AppShell, LoadingScreen, PageTitle } from "@/components/app-shell";
import { Button, Input, Select } from "@/components/ui";
import { useActorGate } from "@/lib/amg/use-actor";
import { getBreakdown, saveBreakdown } from "@/lib/amg/actions";
import { currentYearMonth } from "@/lib/amg/constants";
import { formatRp } from "@/lib/amg/format";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/breakdown")({ component: BreakdownPage });

function BreakdownPage() {
  const { actor, ready, user, isPending } = useActorGate();
  const [ym, setYm] = useState(currentYearMonth());
  const [pack, setPack] = useState<Awaited<ReturnType<typeof getBreakdown>> | null>(null);
  const [vals, setVals] = useState<Record<string, number>>({});
  const [warn, setWarn] = useState(false);

  async function reload(month = ym) {
    const p = await getBreakdown({ data: { yearMonth: month } });
    setPack(p);
    const next: Record<string, number> = {};
    for (const s of p.sales) {
      const found = p.alloc.find((a) => a.sales_user_id === s.user_id && a.company_id === s.company_id);
      next[`${s.company_id}:${s.user_id}`] = found ? Number(found.allocated_value) : 0;
    }
    setVals(next);
  }
  useEffect(() => {
    if (ready && actor?.isPlatform) void reload();
  }, [ready, actor]);

  const byCompany = useMemo(() => {
    if (!pack) return [];
    return pack.companies.map((c) => {
      const people = pack.sales.filter((s) => s.company_id === c.id);
      const total = people.reduce((acc, s) => acc + (vals[`${c.id}:${s.user_id}`] ?? 0), 0);
      const target = pack.targets[c.id];
      const cadangan = target == null ? null : target - total;
      return { c, people, total, target, cadangan };
    });
  }, [pack, vals]);

  if (isPending || !ready) return <LoadingScreen />;
  if (!user) return <RedirectToSignIn />;
  if (!actor) return <LoadingScreen label="Mengalihkan…" />;
  if (!actor.isPlatform) {
    return (
      <AppShell actor={actor}>
        <p className="text-muted">Khusus GM/Admin.</p>
      </AppShell>
    );
  }

  return (
    <AppShell actor={actor}>
      <PageTitle
        kicker="GM"
        title="Breakdown Target"
        action={
          <Select
            value={ym}
            onChange={(e) => {
              setYm(e.target.value);
              void reload(e.target.value);
            }}
            className="w-40"
          >
            {[-1, 0, 1, 2].map((d) => {
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
      <div className="space-y-5">
        {byCompany.map(({ c, people, total, target, cadangan }) => (
          <section key={c.id} className="rounded-[20px] border border-line p-5">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-display text-2xl">{c.name}</h2>
              <p className="text-sm text-muted">
                Target {target == null ? "belum di-set" : formatRp(target)} · Alokasi {formatRp(total)} · Cadangan{" "}
                {cadangan == null ? "—" : formatRp(cadangan)}
              </p>
            </div>
            {people.length === 0 ? <p className="mt-3 text-sm text-muted">Belum ada Sales aktif.</p> : null}
            <div className="mt-3 space-y-2">
              {people.map((s) => (
                <div key={s.user_id} className="flex items-center gap-3">
                  <span className="w-40 text-sm">{s.name}</span>
                  <Input
                    type="number"
                    disabled={!actor.isGm}
                    value={vals[`${c.id}:${s.user_id}`] ?? 0}
                    onChange={(e) => setVals({ ...vals, [`${c.id}:${s.user_id}`]: Number(e.target.value) })}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {actor.isGm ? (
        <Button
          className="mt-6"
          onClick={async () => {
            const over = byCompany.some((x) => x.cadangan != null && x.cadangan < 0);
            if (over && !warn) {
              setWarn(true);
              return;
            }
            const rows = Object.entries(vals).map(([k, value]) => {
              const [companyId, salesUserId] = k.split(":");
              return { companyId, salesUserId, value };
            });
            await saveBreakdown({ data: { yearMonth: ym, rows } });
            setWarn(false);
            await reload();
          }}
        >
          {warn ? "Cadangan negatif. Klik lagi untuk lanjut" : "Simpan breakdown"}
        </Button>
      ) : (
        <p className="mt-4 text-sm text-muted">Admin hanya melihat. GM yang mengalokasikan.</p>
      )}
    </AppShell>
  );
}

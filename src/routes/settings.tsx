import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AppShell, LoadingScreen, PageTitle } from "@/components/app-shell";
import { Button, Field, Input } from "@/components/ui";
import { useActorGate } from "@/lib/amg/use-actor";
import { getSettings, saveKpi, savePillar, saveTarget, saveThreshold, seedDemo, seedLite, wipeLite } from "@/lib/amg/actions";
import { METRICS, PLATFORM_LABEL, currentYearMonth } from "@/lib/amg/constants";
import { formatRp } from "@/lib/amg/format";
import { SIM_UI } from "@/lib/amg/runtime";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function monthsOfYear(year: string) {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

function SettingsPage() {
  const { actor, ready, user, isPending } = useActorGate();
  const [tab, setTab] = useState<"pilar" | "kpi" | "target" | "threshold">("pilar");
  const [data, setData] = useState<Awaited<ReturnType<typeof getSettings>> | null>(null);
  const [opsMsg, setOpsMsg] = useState<string | null>(null);
  const [opsBusy, setOpsBusy] = useState(false);
  const year = currentYearMonth().slice(0, 4);

  async function reload() {
    setData(await getSettings());
  }
  useEffect(() => {
    if (ready && actor?.isAdmin) void reload();
  }, [ready, actor]);

  if (isPending || !ready) return <LoadingScreen />;
  if (!user) return <RedirectToSignIn />;
  if (!actor) return <LoadingScreen label="Mengalihkan…" />;
  if (!actor.isAdmin) {
    return (
      <AppShell actor={actor}>
        <p className="text-muted">Khusus Admin.</p>
      </AppShell>
    );
  }

  return (
    <AppShell actor={actor}>
      <PageTitle
        kicker="Admin"
        title="Pengaturan"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              tone="line"
              disabled={opsBusy}
              onClick={async () => {
                setOpsBusy(true);
                setOpsMsg(null);
                try {
                  await seedLite();
                  await reload();
                  setOpsMsg("Data latihan diisi: 4 brand, beberapa konten & lead. Nanti bisa dihapus, Admin tetap ada.");
                } catch (e) {
                  setOpsMsg(e instanceof Error ? e.message : "Gagal mengisi data latihan.");
                } finally {
                  setOpsBusy(false);
                }
              }}
            >
              Isi data latihan
            </Button>
            <Button
              tone="line"
              disabled={opsBusy}
              onClick={async () => {
                if (!window.confirm("Hapus semua konten, lead, dan user selain Admin? Brand tetap.")) return;
                setOpsBusy(true);
                setOpsMsg(null);
                try {
                  await wipeLite();
                  await reload();
                  setOpsMsg("Data latihan dihapus. Sisakan akun Admin.");
                } catch (e) {
                  setOpsMsg(e instanceof Error ? e.message : "Gagal menghapus.");
                } finally {
                  setOpsBusy(false);
                }
              }}
            >
              Hapus latihan, sisakan Admin
            </Button>
            {SIM_UI ? (
              <Button
                tone="line"
                onClick={async () => {
                  await seedDemo();
                  await reload();
                }}
              >
                Isi target contoh
              </Button>
            ) : null}
          </div>
        }
      />
      {opsMsg ? <p className="mb-4 text-sm text-muted">{opsMsg}</p> : null}
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["pilar", "Pilar"],
            ["kpi", "KPI Platform"],
            ["target", "Sales Target"],
            ["threshold", "Threshold Ranking"],
          ] as const
        ).map(([k, l]) => (
          <Button key={k} tone={tab === k ? "primary" : "line"} onClick={() => setTab(k)}>
            {l}
          </Button>
        ))}
      </div>
      {!data ? <p className="text-muted">Memuat…</p> : null}
      {data && tab === "pilar" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.companies.map((c) => {
            const ps = data.pillars.filter((p) => p.company_id === c.id);
            return (
              <section key={c.id} className="rounded-[20px] border border-line p-4">
                <h2 className="font-display text-xl">{c.name}</h2>
                <ul className="mt-3 space-y-2">
                  {ps.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        {p.sort_order}. {p.pilar_name}
                      </span>
                      <span className="flex gap-1">
                        <Button tone="ghost" className="h-8 px-2" onClick={() => savePillar({ data: { action: "up", companyId: c.id, id: p.id } }).then(reload)}>
                          Naik
                        </Button>
                        <Button tone="ghost" className="h-8 px-2" onClick={() => savePillar({ data: { action: "down", companyId: c.id, id: p.id } }).then(reload)}>
                          Turun
                        </Button>
                        <Button
                          tone="danger"
                          className="h-8 px-2"
                          onClick={() => {
                            if (!confirm("Hapus pilar? Konten lama tetap menyimpan nama pilar ini.")) return;
                            void savePillar({ data: { action: "delete", companyId: c.id, id: p.id } }).then(reload);
                          }}
                        >
                          Hapus
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
                <AddPilar companyId={c.id} onDone={reload} />
              </section>
            );
          })}
        </div>
      ) : null}
      {data && tab === "kpi" ? (
        <div className="space-y-6">
          {data.companies.map((c) => (
            <section key={c.id} className="rounded-[20px] border border-line p-4">
              <h2 className="font-display text-xl">{c.name}</h2>
              <p className="text-xs text-muted">Platform aktif: {c.platforms.join(", ")}</p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {c.platforms.map((p) => {
                  const enabled = data.kpis.find((k) => k.company_id === c.id && k.platform === p)?.enabled ?? [];
                  return (
                    <div key={p} className="rounded-[14px] bg-bg-subtle p-3">
                      <p className="mb-2 text-sm font-medium">{PLATFORM_LABEL[p] ?? p}</p>
                      <div className="flex flex-wrap gap-2">
                        {(METRICS[p] ?? []).map((m) => {
                          const on = enabled.includes(m);
                          return (
                            <button
                              key={m}
                              type="button"
                              className={`rounded-full px-2.5 py-1 text-xs ${on ? "bg-accent text-accent-fg" : "border border-line text-muted"}`}
                              onClick={() => {
                                const next = on ? enabled.filter((x) => x !== m) : [...enabled, m];
                                void saveKpi({ data: { companyId: c.id, platform: p, metrics: next } }).then(reload);
                              }}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : null}
      {data && tab === "target" ? (
        <div className="overflow-x-auto rounded-[20px] border border-line">
          <table className="min-w-[900px] text-left text-xs">
            <thead className="bg-bg-subtle text-muted">
              <tr>
                <th className="px-3 py-2">Brand</th>
                {monthsOfYear(year).map((m) => (
                  <th key={m} className="px-2 py-2">
                    {m.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.companies.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-3 py-2 text-sm">{c.name}</td>
                  {monthsOfYear(year).map((m) => {
                    const cell = data.targets.find((t) => t.companyId === c.id && t.yearMonth === m);
                    let auto: number | null = null;
                    if (cell == null) {
                      const months = monthsOfYear(year);
                      const idx = months.indexOf(m);
                      for (let i = idx - 1; i >= 0; i--) {
                        const prev = data.targets.find((t) => t.companyId === c.id && t.yearMonth === months[i]);
                        if (prev) {
                          auto = prev.value;
                          break;
                        }
                      }
                    }
                    return (
                      <td key={m} className="px-1 py-1">
                        <div className="relative">
                          <input
                            className="h-8 w-24 rounded-md border border-line bg-bg px-1 text-xs"
                            defaultValue={cell?.value ?? auto ?? ""}
                            placeholder="—"
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v === "") return;
                              const n = Number(v);
                              if (cell && n === cell.value) return;
                              if (!cell && auto != null && n === auto) return;
                              void saveTarget({ data: { companyId: c.id, yearMonth: m, value: n } }).then(reload);
                            }}
                          />
                          {!cell && auto != null ? (
                            <span className="absolute -top-1 right-0 rounded bg-warn/20 px-1 text-[9px] text-warn">auto</span>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {data && tab === "threshold" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {data.thresholds.map((t) => {
            const name = data.companies.find((c) => c.id === t.companyId)?.name ?? t.companyId;
            return (
              <ThresholdCard key={t.companyId} name={name} companyId={t.companyId} green={t.greenMin} orange={t.orangeMin} onSave={reload} />
            );
          })}
        </div>
      ) : null}
    </AppShell>
  );
}

function AddPilar({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void savePillar({ data: { action: "add", companyId, name } }).then(() => {
          setName("");
          onDone();
        });
      }}
    >
      <Input placeholder="Pilar baru" value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="submit">Tambah</Button>
    </form>
  );
}

function ThresholdCard({
  name,
  companyId,
  green,
  orange,
  onSave,
}: {
  name: string;
  companyId: string;
  green: number;
  orange: number;
  onSave: () => void;
}) {
  const [g, setG] = useState(green);
  const [o, setO] = useState(orange);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="rounded-[20px] border border-line p-4">
      <h3 className="font-display text-lg">{name}</h3>
      <p className="text-xs text-muted">
        Hijau ≥ {formatRp(g)} · Oranye ≥ {formatRp(o)}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Field label="Hijau min">
          <Input type="number" value={g} onChange={(e) => setG(Number(e.target.value))} />
        </Field>
        <Field label="Oranye min">
          <Input type="number" value={o} onChange={(e) => setO(Number(e.target.value))} />
        </Field>
      </div>
      {err ? <p className="mt-2 text-sm text-danger">{err}</p> : null}
      <Button
        className="mt-3"
        onClick={async () => {
          setErr(null);
          try {
            await saveThreshold({ data: { companyId, greenMin: g, orangeMin: o } });
            onSave();
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Gagal");
          }
        }}
      >
        Simpan
      </Button>
    </div>
  );
}

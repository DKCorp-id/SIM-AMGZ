import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AppShell, LoadingScreen, PageTitle } from "@/components/app-shell";
import { Badge, Button, Empty, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { useActorGate } from "@/lib/amg/use-actor";
import {
  addLeadActivity,
  archiveLead,
  createLead,
  getLeadDetail,
  listLeads,
  moveLeadStatus,
  saveHasil,
  seedDemo,
  updateLead,
} from "@/lib/amg/actions";
import {
  ACTIVITY_JENIS,
  JENIS_KERJASAMA,
  LEAD_KATEGORI,
  LEAD_PRIORITAS,
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  LEAD_SUMBER,
} from "@/lib/amg/constants";
import { formatDate, formatRp, formatRpCompact } from "@/lib/amg/format";
import type { LeadActivity, LeadRow } from "@/lib/amg/types";
import { SIM_UI } from "@/lib/amg/runtime";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/crm")({ component: CrmPage });

function prioBorder(p: string) {
  if (p === "Tinggi") return "border-l-danger";
  if (p === "Sedang") return "border-l-warn";
  return "border-l-muted";
}

function CrmPage() {
  const { actor, ready, user, isPending } = useActorGate();
  const [tab, setTab] = useState<"aktif" | "arsip">("aktif");
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<LeadRow | null>(null);
  const [acts, setActs] = useState<LeadActivity[]>([]);
  const [warn, setWarn] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fKat, setFKat] = useState("");
  const [fPrio, setFPrio] = useState("");
  const [fSumber, setFSumber] = useState("");

  async function reload() {
    setRows(await listLeads({ data: { archived: tab === "arsip" } }));
  }
  useEffect(() => {
    if (ready && actor) void reload();
  }, [ready, actor, tab]);

  const grouped = useMemo(() => {
    const g: Record<string, LeadRow[]> = {};
    for (const s of LEAD_STATUSES) g[s] = [];
    const filtered = rows.filter((r) => {
      if (fKat && r.kategori !== fKat) return false;
      if (fPrio && r.prioritas !== fPrio) return false;
      if (fSumber && r.sumber !== fSumber) return false;
      if (q) {
        const hay = `${r.nama} ${r.hp} ${r.picNama}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    for (const r of filtered) (g[r.status] ?? (g[r.status] = [])).push(r);
    return g;
  }, [rows, q, fKat, fPrio, fSumber]);

  if (isPending || !ready) return <LoadingScreen />;
  if (!user) return <RedirectToSignIn />;
  if (!actor) return <LoadingScreen label="Mengalihkan…" />;
  if (!actor.isSales && !actor.isPlatform) {
    return (
      <AppShell actor={actor}>
        <p className="text-muted">Tidak berhak.</p>
      </AppShell>
    );
  }

  async function openDetail(id: string) {
    try {
      const d = await getLeadDetail({ data: { id } });
      setDetail(d.lead);
      setActs(d.activities);
    } catch (e) {
      setWarn(e instanceof Error ? e.message : "Tidak berhak.");
    }
  }

  return (
    <AppShell actor={actor}>
      <PageTitle
        kicker="Pipeline"
        title="CRM"
        action={
          actor.isSales ? (
            <div className="flex gap-2">
              {SIM_UI ? (
                <Button
                  tone="line"
                  onClick={async () => {
                    try {
                      await seedDemo();
                      await reload();
                    } catch (e) {
                      setWarn(e instanceof Error ? e.message : "Gagal isi contoh");
                    }
                  }}
                >
                  Isi contoh
                </Button>
              ) : null}
              <Button onClick={() => setCreateOpen(true)}>Lead baru</Button>
            </div>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button tone={tab === "aktif" ? "primary" : "line"} onClick={() => setTab("aktif")}>
          Aktif
        </Button>
        <Button tone={tab === "arsip" ? "primary" : "line"} onClick={() => setTab("arsip")}>
          Arsip
        </Button>
      </div>
      {tab === "aktif" ? (
        <div className="mb-4 grid gap-2 sm:grid-cols-4">
          <Input placeholder="Cari nama / HP" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={fKat} onChange={(e) => setFKat(e.target.value)}>
            <option value="">Semua kategori</option>
            {LEAD_KATEGORI.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select value={fPrio} onChange={(e) => setFPrio(e.target.value)}>
            <option value="">Semua prioritas</option>
            {LEAD_PRIORITAS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select value={fSumber} onChange={(e) => setFSumber(e.target.value)}>
            <option value="">Semua sumber</option>
            {LEAD_SUMBER.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </div>
      ) : null}
      {tab === "arsip" ? (
        rows.length === 0 ? (
          <Empty title="Tidak ada lead terarsip." />
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-[16px] border border-line px-4 py-3">
                <div>
                  <p className="font-medium">{r.nama}</p>
                  <p className="text-xs text-muted">
                    {LEAD_STATUS_LABEL[r.status]} · {r.companyName}
                  </p>
                </div>
                <Button
                  tone="line"
                  onClick={async () => {
                    await archiveLead({ data: { id: r.id, restore: true } });
                    await reload();
                  }}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {LEAD_STATUSES.map((s) => (
            <section
              key={s}
              className="w-[260px] shrink-0 rounded-[20px] bg-bg-elev p-3"
              onDragOver={(e) => {
                if (actor.isSales) e.preventDefault();
              }}
              onDrop={async (e) => {
                if (!actor.isSales) return;
                e.preventDefault();
                const id = e.dataTransfer.getData("text/lead-id");
                if (!id) return;
                try {
                  await moveLeadStatus({ data: { id, status: s } });
                  await reload();
                } catch (er) {
                  setWarn(er instanceof Error ? er.message : "Gagal pindah");
                }
              }}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted">{LEAD_STATUS_LABEL[s]}</h2>
                <span className="text-xs text-faint">{grouped[s]?.length ?? 0}</span>
              </div>
              <div className="min-h-16 space-y-2">
                {(grouped[s] ?? []).length === 0 ? (
                  <p className="px-1 text-xs text-faint">Tidak ada lead di status ini.</p>
                ) : null}
                {(grouped[s] ?? []).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    draggable={actor.isSales}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/lead-id", r.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => void openDetail(r.id)}
                    className={`w-full rounded-[14px] border border-line border-l-4 bg-bg p-3 text-left ${prioBorder(r.prioritas)}`}
                  >
                    <p className="font-medium">{r.nama}</p>
                    <p className="mt-1 text-xs text-muted">{formatRpCompact(r.nilai)}</p>
                    <p className="text-xs text-faint">{r.picNama}</p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {rows.length === 0 && tab === "aktif" ? (
        <Empty title="Tidak ada lead di pipeline." hint="Sales membuat lead baru, atau isi contoh." />
      ) : null}

      <CreateLeadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async (w) => {
          setCreateOpen(false);
          setWarn(w);
          await reload();
        }}
      />
      {warn ? <p className="mt-3 text-sm text-warn">{warn}</p> : null}

      {detail ? (
        <LeadModal
          lead={detail}
          acts={acts}
          canEdit={actor.isSales && detail.assignedTo === actor.userId}
          onClose={() => setDetail(null)}
          onChanged={async () => {
            await reload();
            await openDetail(detail.id);
          }}
        />
      ) : null}
    </AppShell>
  );
}

function CreateLeadModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (w: string | null) => void;
}) {
  const [form, setForm] = useState({
    nama: "",
    picNama: "",
    picJabatan: "",
    hp: "",
    email: "",
    sumber: "Referral" as (typeof LEAD_SUMBER)[number],
    kategori: "Kolaborasi Konten" as (typeof LEAD_KATEGORI)[number],
    prioritas: "Sedang" as (typeof LEAD_PRIORITAS)[number],
    brief: "",
    nilai: 0,
  });
  const [err, setErr] = useState<string | null>(null);
  return (
    <Modal open={open} title="Lead baru" onClose={onClose}>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          try {
            const res = await createLead({ data: form });
            onCreated(res.warning);
          } catch (er) {
            setErr(er instanceof Error ? er.message : "Gagal");
          }
        }}
      >
        <Field label="Nama brand/partner">
          <Input required value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
        </Field>
        <Field label="PIC">
          <Input required value={form.picNama} onChange={(e) => setForm({ ...form, picNama: e.target.value })} />
        </Field>
        <Field label="Jabatan">
          <Input value={form.picJabatan} onChange={(e) => setForm({ ...form, picJabatan: e.target.value })} />
        </Field>
        <Field label="HP">
          <Input required value={form.hp} onChange={(e) => setForm({ ...form, hp: e.target.value })} />
        </Field>
        <Field label="Sumber">
          <Select value={form.sumber} onChange={(e) => setForm({ ...form, sumber: e.target.value as typeof form.sumber })}>
            {LEAD_SUMBER.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Kategori">
          <Select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value as typeof form.kategori })}>
            {LEAD_KATEGORI.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Prioritas">
          <Select value={form.prioritas} onChange={(e) => setForm({ ...form, prioritas: e.target.value as typeof form.prioritas })}>
            {LEAD_PRIORITAS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Nilai estimasi (Rp)">
          <Input type="number" min={0} value={form.nilai} onChange={(e) => setForm({ ...form, nilai: Number(e.target.value) })} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Brief">
            <Textarea value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} />
          </Field>
        </div>
        {err ? <p className="sm:col-span-2 text-sm text-danger">{err}</p> : null}
        <div className="sm:col-span-2">
          <Button type="submit" className="w-full">
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function LeadModal({
  lead,
  acts,
  canEdit,
  onClose,
  onChanged,
}: {
  lead: LeadRow;
  acts: LeadActivity[];
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState(lead.status);
  const [nilai, setNilai] = useState(lead.nilai);
  const [jenis, setJenis] = useState<(typeof ACTIVITY_JENIS)[number]>("wa");
  const [catatan, setCatatan] = useState("");
  const [next, setNext] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [jk, setJk] = useState(lead.jenisKerjasama ?? "Berbayar");
  const [nilaiFinal, setNilaiFinal] = useState(lead.nilaiFinal ?? lead.nilai);
  const [periode, setPeriode] = useState(lead.periode ?? "");
  const [deliv, setDeliv] = useState(lead.deliverables ?? "");
  const [err, setErr] = useState<string | null>(null);
  const dealish = ["deal", "jalan", "selesai"].includes(status);

  useEffect(() => {
    setStatus(lead.status);
    setNilai(lead.nilai);
    setJk(lead.jenisKerjasama ?? "Berbayar");
    setNilaiFinal(lead.nilaiFinal ?? lead.nilai);
    setPeriode(lead.periode ?? "");
    setDeliv(lead.deliverables ?? "");
  }, [lead]);

  return (
    <Modal open wide title={lead.nama} onClose={onClose}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm text-muted">
            {lead.picNama} · {lead.kategori} · {lead.companyName}
          </p>
          <Field label="Status">
            <Select disabled={!canEdit} value={status} onChange={(e) => setStatus(e.target.value)}>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nilai estimasi">
            <Input disabled={!canEdit} type="number" value={nilai} onChange={(e) => setNilai(Number(e.target.value))} />
          </Field>
          {canEdit ? (
            <Button
              onClick={async () => {
                setErr(null);
                try {
                  await updateLead({
                    data: {
                      id: lead.id,
                      nama: lead.nama,
                      picNama: lead.picNama,
                      picJabatan: lead.picJabatan,
                      hp: lead.hp,
                      email: lead.email,
                      sumber: lead.sumber as (typeof LEAD_SUMBER)[number],
                      kategori: lead.kategori as (typeof LEAD_KATEGORI)[number],
                      prioritas: lead.prioritas as (typeof LEAD_PRIORITAS)[number],
                      brief: lead.brief,
                      nilai,
                      status: status as (typeof LEAD_STATUSES)[number],
                    },
                  });
                  onChanged();
                } catch (er) {
                  setErr(er instanceof Error ? er.message : "Gagal");
                }
              }}
            >
              Simpan perubahan
            </Button>
          ) : (
            <p className="text-xs text-muted">Admin/GM melihat saja. Activity diisi Sales.</p>
          )}
          {dealish ? (
            <div className="rounded-[16px] border border-line p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted">Hasil kerja sama</p>
              <div className="grid gap-2">
                <Select disabled={!canEdit} value={jk} onChange={(e) => setJk(e.target.value)}>
                  {JENIS_KERJASAMA.map((j) => (
                    <option key={j}>{j}</option>
                  ))}
                </Select>
                <Input disabled={!canEdit} type="number" value={nilaiFinal} onChange={(e) => setNilaiFinal(Number(e.target.value))} />
                <Input disabled={!canEdit} placeholder="Periode" value={periode} onChange={(e) => setPeriode(e.target.value)} />
                <Textarea disabled={!canEdit} placeholder="Deliverables" value={deliv} onChange={(e) => setDeliv(e.target.value)} />
                {canEdit ? (
                  <Button
                    tone="line"
                    onClick={async () => {
                      await saveHasil({
                        data: {
                          leadId: lead.id,
                          jenisKerjasama: jk as (typeof JENIS_KERJASAMA)[number],
                          nilaiFinal,
                          periode,
                          deliverables: deliv,
                        },
                      });
                      onChanged();
                    }}
                  >
                    Simpan hasil
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
          {canEdit && ["baru", "dihubungi", "nego"].includes(lead.status) ? (
            <Button
              tone="danger"
              onClick={async () => {
                try {
                  await archiveLead({ data: { id: lead.id } });
                  onClose();
                  onChanged();
                } catch (er) {
                  setErr(er instanceof Error ? er.message : "Gagal");
                }
              }}
            >
              Arsipkan
            </Button>
          ) : null}
          {err ? <p className="text-sm text-danger">{err}</p> : null}
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted">Activity</p>
          {canEdit ? (
            <form
              className="mb-4 space-y-2 rounded-[16px] border border-line p-3"
              onSubmit={async (e) => {
                e.preventDefault();
                await addLeadActivity({
                  data: {
                    leadId: lead.id,
                    jenis,
                    catatan,
                    tanggal: new Date().toISOString().slice(0, 10),
                    tindakLanjut: next || null,
                    tindakLanjutTanggal: nextDate || null,
                  },
                });
                setCatatan("");
                setNext("");
                onChanged();
              }}
            >
              <Select value={jenis} onChange={(e) => setJenis(e.target.value as typeof jenis)}>
                {ACTIVITY_JENIS.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </Select>
              <Textarea required placeholder="Catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
              <Input placeholder="Tindak lanjut (opsional)" value={next} onChange={(e) => setNext(e.target.value)} />
              <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
              <Button type="submit" className="w-full" tone="line">
                Tambah activity
              </Button>
            </form>
          ) : null}
          <div className="space-y-3">
            {acts.map((a) => (
              <div key={a.id} className="border-b border-line pb-3 text-sm">
                <p className="text-xs text-muted">
                  {a.jenis} · {formatDate(a.tanggal)} · {a.userName}
                </p>
                <p>{a.catatan}</p>
                {a.tindakLanjut ? (
                  <p className="text-warn">
                    — Next: {a.tindakLanjut} {a.tindakLanjutTanggal ? `(${formatDate(a.tindakLanjutTanggal)})` : ""}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-faint">{formatRp(lead.nilai)}</p>
    </Modal>
  );
}

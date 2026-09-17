import { createFileRoute, Link } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AppShell, LoadingScreen, PageTitle } from "@/components/app-shell";
import { Badge, Button, Empty, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { useActorGate } from "@/lib/amg/use-actor";
import {
  createContent,
  deleteContent,
  listContent,
  listKreators,
  listPillars,
  seedDemo,
  updateContent,
} from "@/lib/amg/actions";
import { CONTENT_STATUS_LABEL, FORMATS, PLATFORM_LABEL } from "@/lib/amg/constants";
import { formatDate } from "@/lib/amg/format";
import type { ContentRow } from "@/lib/amg/types";
import { SIM_UI } from "@/lib/amg/runtime";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/konten")({ component: KontenPage });

function statusTone(s: string) {
  if (s === "publish") return "ok" as const;
  if (s === "draft") return "line" as const;
  if (s === "batal") return "danger" as const;
  return "muted" as const;
}

function KontenPage() {
  const { actor, ready, user, isPending } = useActorGate();
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ContentRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    const list = await listContent();
    setRows(list);
  }

  useEffect(() => {
    if (ready && actor && (actor.isEditor || actor.isPlatform)) void reload();
  }, [ready, actor]);

  if (isPending || !ready) return <LoadingScreen />;
  if (!user) return <RedirectToSignIn />;
  if (!actor) return <LoadingScreen label="Mengalihkan…" />;
  if (!actor.isEditor && !actor.isPlatform) {
    return (
      <AppShell actor={actor}>
        <p className="text-muted">Halaman ini khusus Editor.</p>
      </AppShell>
    );
  }

  return (
    <AppShell actor={actor}>
      <PageTitle
        kicker={actor.companyName ?? "Brand"}
        title={actor.isEditor ? "Konten Saya" : "Semua Konten"}
        action={
          <div className="flex gap-2">
            {SIM_UI ? (
              <Button
                tone="line"
                onClick={async () => {
                  await seedDemo();
                  await reload();
                }}
              >
                Isi contoh
              </Button>
            ) : null}
            {actor.isEditor ? (
              <Button
                onClick={() => {
                  setEdit(null);
                  setOpen(true);
                }}
              >
                Buat konten
              </Button>
            ) : null}
          </div>
        }
      />
      <p className="mb-4 text-sm text-muted">
        Hanya rencana yang Anda buat. Editor lain tidak melihat daftar ini. Setelah kreator menayangkan video, status
        berubah jadi Publish dan tautan hasil muncul di baris itu — Anda tidak menempel tautan di sini.
      </p>
      {rows.length === 0 ? (
        <Empty title="Belum ada konten." hint="Buat rencana pertama, atau isi contoh untuk uji coba." />
      ) : (
        <div className="overflow-x-auto rounded-[20px] border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-bg-subtle text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Tema</th>
                <th className="px-4 py-3">Tayang</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Kreator</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">
                    <Link to="/konten/$id" params={{ id: r.id }} className="underline-offset-2 hover:underline">
                      {r.tema}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(r.tanggalTayang)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(r.status)}>{CONTENT_STATUS_LABEL[r.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {PLATFORM_LABEL[r.platform]} · {r.format}
                  </td>
                  <td className="px-4 py-3">{r.assignedName ?? <Badge tone="warn">Belum di-assign</Badge>}</td>
                  <td className="px-4 py-3 text-right">
                    {actor.isEditor ? (
                      <>
                        <Button
                          tone="ghost"
                          className="h-8 px-2"
                          onClick={() => {
                            setEdit(r);
                            setOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        {r.status === "rencana" || r.status === "draft" ? (
                          <Button
                            tone="danger"
                            className="h-8 px-2"
                            onClick={async () => {
                              if (!confirm("Hapus konten ini?")) return;
                              await deleteContent({ data: { id: r.id } });
                              await reload();
                            }}
                          >
                            Hapus
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ContentForm
        open={open}
        row={edit}
        companyId={actor.companyId!}
        platforms={actor.companyId ? [] : []}
        onClose={() => setOpen(false)}
        err={err}
        setErr={setErr}
        onSaved={async () => {
          setOpen(false);
          await reload();
        }}
      />
    </AppShell>
  );
}

function ContentForm({
  open,
  row,
  companyId,
  onClose,
  onSaved,
  err,
  setErr,
}: {
  open: boolean;
  row: ContentRow | null;
  companyId: string;
  platforms: string[];
  onClose: () => void;
  onSaved: () => void;
  err: string | null;
  setErr: (s: string | null) => void;
}) {
  const { companies } = useActorGate();
  const co = companies.find((c) => c.id === companyId);
  const plats = co?.platforms ?? ["instagram", "tiktok"];
  const [tanggal, setTanggal] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [format, setFormat] = useState("Reel");
  const [pillarId, setPillarId] = useState("");
  const [tema, setTema] = useState("");
  const [assigned, setAssigned] = useState("");
  const [catatan, setCatatan] = useState("");
  const [pillars, setPillars] = useState<Array<{ id: string; pilar_name: string }>>([]);
  const [kreators, setKreators] = useState<Array<{ user_id: string; name: string }>>([]);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setTanggal(row?.tanggalTayang ?? new Date().toISOString().slice(0, 10));
    setPlatform(row?.platform ?? plats[0] ?? "instagram");
    setFormat(row?.format ?? "Reel");
    setPillarId(row?.pillarSettingId ?? "");
    setTema(row?.tema ?? "");
    setAssigned(row?.assignedTo ?? "");
    setCatatan(row?.catatan ?? "");
    void listPillars({ data: { companyId } }).then((p) => {
      setPillars(p);
      if (!row && p[0]) setPillarId(p[0].id);
      if (row) setPillarId(row.pillarSettingId ?? p[0]?.id ?? "");
    });
    void listKreators({ data: { companyId } }).then(setKreators);
  }, [open, row, companyId]);

  const formats = useMemo(() => FORMATS[platform] ?? [], [platform]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const payload = {
      tanggalTayang: tanggal,
      platform,
      format,
      pillarSettingId: pillarId,
      tema,
      assignedTo: assigned || null,
      catatan,
    };
    try {
      if (row) await updateContent({ data: { id: row.id, ...payload } });
      else await createContent({ data: payload });
      onSaved();
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Gagal simpan.");
    }
  }

  return (
    <Modal open={open} title={row ? "Edit konten" : "Buat konten"} onClose={onClose}>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={save}>
        <Field label="Tanggal tayang">
          <Input type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </Field>
        <Field label="Platform">
          <Select
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value);
              setFormat((FORMATS[e.target.value] ?? [])[0] ?? "");
            }}
          >
            {plats.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABEL[p] ?? p}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Format">
          <Select value={format} onChange={(e) => setFormat(e.target.value)}>
            {formats.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
        </Field>
        <Field label="Pilar">
          <Select value={pillarId} onChange={(e) => setPillarId(e.target.value)}>
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.pilar_name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Tema">
            <Input required maxLength={200} value={tema} onChange={(e) => setTema(e.target.value)} />
          </Field>
        </div>
        <Field label="Assign Kreator">
          <Select value={assigned} onChange={(e) => setAssigned(e.target.value)}>
            <option value="">Belum di-assign</option>
            {kreators.map((k) => (
              <option key={k.user_id} value={k.user_id}>
                {k.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Catatan / brief">
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </Field>
        </div>
        {err ? <p className="sm:col-span-2 text-sm text-danger">{err}</p> : null}
        <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
          <Button type="button" tone="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}

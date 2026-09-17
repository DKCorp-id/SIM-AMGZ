import { createFileRoute, Link } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AppShell, LoadingScreen, PageTitle } from "@/components/app-shell";
import { Badge, Button, Empty, Field, Input, Modal, Select } from "@/components/ui";
import { PanduanUnggah } from "@/components/panduan-unggah";
import { useActorGate } from "@/lib/amg/use-actor";
import { listTugas, updateContentStatus } from "@/lib/amg/actions";
import { CONTENT_STATUSES, CONTENT_STATUS_LABEL, PLATFORM_LABEL } from "@/lib/amg/constants";
import { formatDate } from "@/lib/amg/format";
import type { ContentRow } from "@/lib/amg/types";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/tugas")({ component: TugasPage });

function TugasPage() {
  const { actor, ready, user, isPending } = useActorGate();
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [pick, setPick] = useState<ContentRow | null>(null);
  const [status, setStatus] = useState("draft");
  const [link, setLink] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  async function reload() {
    setRows(await listTugas());
  }
  useEffect(() => {
    if (ready && actor?.isKreator) void reload();
  }, [ready, actor]);

  if (isPending || !ready) return <LoadingScreen />;
  if (!user) return <RedirectToSignIn />;
  if (!actor) return <LoadingScreen label="Mengalihkan…" />;
  if (!actor.isKreator) {
    return (
      <AppShell actor={actor}>
        <p className="text-muted">Khusus Kreator.</p>
      </AppShell>
    );
  }

  const pending = rows.filter((r) => r.status === "rencana" || r.status === "draft");
  const done = rows.filter((r) => r.status === "publish");
  const cancelled = rows.filter((r) => r.status === "batal");

  return (
    <AppShell actor={actor}>
      <PageTitle
        kicker={actor.companyName ?? ""}
        title="Tugas Konten"
        action={
          <Button tone="line" onClick={() => setShowGuide((v) => !v)}>
            {showGuide ? "Sembunyikan cara unggah" : "Cara unggah hasil"}
          </Button>
        }
      />

      {showGuide ? (
        <div className="mb-8 rounded-[24px] border border-line bg-bg-elev p-5 sm:p-6">
          <PanduanUnggah compact />
        </div>
      ) : (
        <p className="mb-6 text-sm text-muted">
          Bingung menempel tautan? Ketuk “Cara unggah hasil”, atau buka{" "}
          <Link to="/panduan" className="text-fg underline underline-offset-2">
            Panduan
          </Link>
          .
        </p>
      )}

      {rows.length === 0 ? (
        <Empty title="Belum ada tugas yang di-assign." hint="Minta Editor menugaskan konten ke Anda." />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">Perlu dikerjakan ({pending.length})</h2>
            {pending.length === 0 ? (
              <p className="text-sm text-muted">Tidak ada tugas terbuka.</p>
            ) : (
              <div className="space-y-3">
                {pending.map((r) => (
                  <TugasCard
                    key={r.id}
                    row={r}
                    onPick={() => {
                      setPick(r);
                      setStatus(r.status === "rencana" ? "draft" : r.status);
                      setLink(r.linkHasil ?? "");
                      setErr(null);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">Sudah diunggah / Publish ({done.length})</h2>
            {done.length === 0 ? (
              <p className="text-sm text-muted">Belum ada yang Publish. Setelah video tayang, ubah status dan tempel tautan.</p>
            ) : (
              <div className="space-y-3">
                {done.map((r) => (
                  <TugasCard
                    key={r.id}
                    row={r}
                    onPick={() => {
                      setPick(r);
                      setStatus(r.status);
                      setLink(r.linkHasil ?? "");
                      setErr(null);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
          {cancelled.length > 0 ? (
            <section>
              <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">Batal ({cancelled.length})</h2>
              <div className="space-y-3">
                {cancelled.map((r) => (
                  <TugasCard
                    key={r.id}
                    row={r}
                    onPick={() => {
                      setPick(r);
                      setStatus(r.status);
                      setLink(r.linkHasil ?? "");
                      setErr(null);
                    }}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <Modal open={!!pick} title="Unggah hasil / ubah status" onClose={() => setPick(null)}>
        {pick ? (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await updateContentStatus({
                  data: { id: pick.id, status: status as (typeof CONTENT_STATUSES)[number], linkHasil: link },
                });
                setPick(null);
                await reload();
              } catch (er) {
                setErr(er instanceof Error ? er.message : "Gagal.");
              }
            }}
          >
            <div className="rounded-[14px] bg-bg-subtle px-3 py-2 text-sm">
              <p className="font-medium text-fg">{pick.tema}</p>
              <p className="mt-1 text-xs text-muted">
                {PLATFORM_LABEL[pick.platform]} · {pick.format} · {formatDate(pick.tanggalTayang)}
              </p>
            </div>

            <ol className="space-y-1 text-sm leading-relaxed text-muted">
              <li>1. Video sudah tayang di {PLATFORM_LABEL[pick.platform]}?</li>
              <li>2. Pilih status Publish.</li>
              <li>3. Tempel tautan postingan (bukan tautan profil).</li>
              <li>4. Ketuk Simpan.</li>
            </ol>

            <Field
              label="Status"
              hint="Draft = masih dikerjakan. Publish = sudah tayang + tautan. Batal = tidak jadi."
            >
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {CONTENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CONTENT_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
            {status === "publish" ? (
              <Field
                label="Link hasil (wajib)"
                hint="Contoh: https://www.instagram.com/reel/……/ — salin dari tombol Bagikan di aplikasi sosmed."
              >
                <Input
                  required
                  type="url"
                  inputMode="url"
                  placeholder="https://www.instagram.com/reel/…"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </Field>
            ) : (
              <p className="text-xs text-muted">Kotak tautan muncul setelah status diubah ke Publish.</p>
            )}
            {err ? <p className="text-sm text-danger">{err}</p> : null}
            <Button type="submit" className="w-full">
              Simpan
            </Button>
          </form>
        ) : null}
      </Modal>
    </AppShell>
  );
}

function TugasCard({ row, onPick }: { row: ContentRow; onPick: () => void }) {
  return (
    <article className="rounded-[20px] border border-line bg-bg-elev p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">{row.tema}</h2>
          <p className="mt-1 text-sm text-muted">
            {PLATFORM_LABEL[row.platform]} · {row.format} · {formatDate(row.tanggalTayang)} · Pilar {row.pilarName}
          </p>
        </div>
        <Badge tone={row.status === "publish" ? "ok" : row.status === "batal" ? "danger" : "muted"}>
          {CONTENT_STATUS_LABEL[row.status]}
        </Badge>
      </div>
      {row.catatan ? <p className="mt-3 rounded-[12px] bg-bg-subtle px-3 py-2 text-sm text-fg">{row.catatan}</p> : null}
      {row.linkHasil ? (
        <p className="mt-3 text-sm">
          Hasil:{" "}
          <a href={row.linkHasil} className="break-all underline" target="_blank" rel="noreferrer">
            {row.linkHasil}
          </a>
        </p>
      ) : null}
      <Button className="mt-4" tone={row.status === "publish" ? "line" : "primary"} onClick={onPick}>
        {row.status === "publish" ? "Ubah tautan / status" : row.status === "batal" ? "Ubah status" : "Unggah hasil"}
      </Button>
    </article>
  );
}

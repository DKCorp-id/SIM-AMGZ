import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AppShell, LoadingScreen, PageTitle } from "@/components/app-shell";
import { Badge, Button, Empty, Field, Input, Modal, Select } from "@/components/ui";
import { useActorGate } from "@/lib/amg/use-actor";
import { adminResetPassword, inviteUser, listUsers, updateUser } from "@/lib/amg/actions";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/users")({ component: UsersPage });

type Row = Awaited<ReturnType<typeof listUsers>>[number];

function UsersPage() {
  const { actor, companies, ready, user, isPending } = useActorGate();
  const [rows, setRows] = useState<Row[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [setupPath, setSetupPath] = useState<string | null>(null);

  async function reload() {
    setRows(await listUsers());
  }
  useEffect(() => {
    if (ready && actor?.isPlatform) void reload();
  }, [ready, actor]);

  if (isPending || !ready) return <LoadingScreen />;
  if (!user) return <RedirectToSignIn />;
  if (!actor) return <LoadingScreen label="Mengalihkan…" />;
  if (!actor.isPlatform) {
    return (
      <AppShell actor={actor}>
        <p className="text-muted">Tidak berhak.</p>
      </AppShell>
    );
  }

  return (
    <AppShell actor={actor}>
      <PageTitle
        kicker="Akses"
        title="Kelola User"
        action={<Button onClick={() => setInviteOpen(true)}>Undang user</Button>}
      />
      <p className="mb-4 text-sm text-muted">User baru lewat undangan. Kata sandi tidak pernah ditampilkan.</p>
      {notice ? <p className="mb-3 text-sm text-ok">{notice}</p> : null}
      {setupPath ? (
        <p className="mb-4 rounded-[14px] border border-line bg-bg-subtle px-4 py-3 text-xs text-muted">
          Tautan set kata sandi (kirim ke email user):{" "}
          <a className="text-fg underline" href={setupPath}>
            {setupPath}
          </a>
        </p>
      ) : null}
      {rows.length === 0 ? (
        <Empty title="Belum ada user." />
      ) : (
        <div className="overflow-x-auto rounded-[20px] border border-line">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-bg-subtle text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Akses</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const bits = [r.role, r.isEditor ? "Editor" : null, r.isKreator ? "Kreator" : null, r.isSales ? "Sales" : null].filter(
                  Boolean,
                );
                const platform = r.role === "admin" || r.role === "gm";
                return (
                  <tr key={r.userId} className="border-t border-line">
                    <td className="px-4 py-3">
                      {r.isActive ? r.name : `${r.name} (tidak aktif)`}
                      <div className="text-xs text-faint">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 text-muted">{r.companyName ?? "—"}</td>
                    <td className="px-4 py-3">
                      {bits.map((b) => (
                        <Badge key={String(b)} tone="line">
                          {b}
                        </Badge>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={r.isActive ? "ok" : "danger"}>{r.isActive ? "Aktif" : "Nonaktif"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {platform && !actor.isAdmin ? null : (
                        <div className="flex justify-end gap-1">
                          <Button tone="ghost" className="h-8" onClick={() => setEdit(r)}>
                            Edit
                          </Button>
                          {actor.isAdmin ? (
                            <Button
                              tone="line"
                              className="h-8"
                              onClick={async () => {
                                try {
                                  const res = await adminResetPassword({ data: { userId: r.userId } });
                                  setNotice(res.message);
                                  setSetupPath(
                                    typeof window === "undefined"
                                      ? res.setupPath
                                      : `${window.location.origin}${res.setupPath}`,
                                  );
                                } catch (e) {
                                  setNotice(e instanceof Error ? e.message : "Gagal");
                                }
                              }}
                            >
                              Reset sandi
                            </Button>
                          ) : null}
                          <Button
                            tone="line"
                            className="h-8"
                            onClick={async () => {
                              try {
                                await updateUser({
                                  data: {
                                    userId: r.userId,
                                    name: r.name,
                                    isEditor: r.isEditor,
                                    isKreator: r.isKreator,
                                    isSales: r.isSales,
                                    isActive: !r.isActive,
                                    companyId: r.companyId,
                                  },
                                });
                                await reload();
                              } catch (e) {
                                setNotice(e instanceof Error ? e.message : "Gagal");
                              }
                            }}
                          >
                            {r.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <InviteModal
        open={inviteOpen}
        isAdmin={actor.isAdmin}
        companies={companies}
        onClose={() => setInviteOpen(false)}
        onDone={(msg, path) => {
          setInviteOpen(false);
          setNotice(msg);
          setSetupPath(`${window.location.origin}${path}`);
          void reload();
        }}
      />
      {edit ? (
        <EditModal
          row={edit}
          onClose={() => setEdit(null)}
          onDone={() => {
            setEdit(null);
            void reload();
          }}
        />
      ) : null}
    </AppShell>
  );
}

function InviteModal({
  open,
  isAdmin,
  companies,
  onClose,
  onDone,
}: {
  open: boolean;
  isAdmin: boolean;
  companies: Array<{ id: string; name: string }>;
  onClose: () => void;
  onDone: (msg: string, path: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<"brand" | "admin" | "gm">("brand");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [isEditor, setIsEditor] = useState(true);
  const [isKreator, setIsKreator] = useState(false);
  const [isSales, setIsSales] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Modal open={open} title="Undang user" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          try {
            const res = await inviteUser({
              data: {
                name,
                email,
                kind,
                companyId: kind === "brand" ? companyId : null,
                isEditor: kind === "brand" ? isEditor : false,
                isKreator: kind === "brand" ? isKreator : false,
                isSales: kind === "brand" ? isSales : false,
              },
            });
            onDone(res.message, res.setupPath);
          } catch (er) {
            setErr(er instanceof Error ? er.message : "Gagal");
          }
        }}
      >
        <Field label="Nama">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {isAdmin ? (
          <Field label="Jenis">
            <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="brand">User brand</option>
              <option value="admin">Admin</option>
              <option value="gm">GM</option>
            </Select>
          </Field>
        ) : null}
        {kind === "brand" ? (
          <>
            <Field label="Brand">
              <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isEditor} onChange={(e) => setIsEditor(e.target.checked)} /> Editor
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isKreator} onChange={(e) => setIsKreator(e.target.checked)} /> Kreator
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isSales} onChange={(e) => setIsSales(e.target.checked)} /> Sales
              </label>
            </div>
          </>
        ) : null}
        {err ? <p className="text-sm text-danger">{err}</p> : null}
        <Button type="submit" className="w-full">
          Buat undangan
        </Button>
      </form>
    </Modal>
  );
}

function EditModal({ row, onClose, onDone }: { row: Row; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(row.name);
  const [isEditor, setIsEditor] = useState(row.isEditor);
  const [isKreator, setIsKreator] = useState(row.isKreator);
  const [isSales, setIsSales] = useState(row.isSales);
  const [err, setErr] = useState<string | null>(null);
  const platform = row.role === "admin" || row.role === "gm";

  return (
    <Modal open title={`Edit ${row.name}`} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          try {
            await updateUser({
              data: {
                userId: row.userId,
                name,
                isEditor,
                isKreator,
                isSales,
                isActive: row.isActive,
                companyId: row.companyId,
              },
            });
            onDone();
          } catch (er) {
            setErr(er instanceof Error ? er.message : "Gagal");
          }
        }}
      >
        <Field label="Nama">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {platform ? (
          <p className="text-xs text-muted">Role platform tidak diubah dari UI.</p>
        ) : (
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isEditor} onChange={(e) => setIsEditor(e.target.checked)} /> Editor
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isKreator} onChange={(e) => setIsKreator(e.target.checked)} /> Kreator
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isSales} onChange={(e) => setIsSales(e.target.checked)} /> Sales
            </label>
          </div>
        )}
        {err ? <p className="text-sm text-danger">{err}</p> : null}
        <Button type="submit" className="w-full">
          Simpan
        </Button>
      </form>
    </Modal>
  );
}
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { z } from "zod";
import { getActor, listCompanies } from "./actor";
import {
  ACTIVITY_JENIS,
  CONTENT_STATUSES,
  FORMATS,
  JENIS_KERJASAMA,
  LEAD_KATEGORI,
  LEAD_PRIORITAS,
  LEAD_STATUSES,
  LEAD_SUMBER,
  METRICS,
  currentYearMonth,
  nid,
  todayISO,
} from "./constants";
import { num, parsePlatforms } from "./format";
import { landingPath } from "./types";
import { seedSimWorld } from "./sim-seed";
import { SIM_ACCOUNTS } from "./sim-cast";
import { consumeAccessToken, ensureCredentialUser, issueAccessToken, setCredentialPassword } from "./access";

function fail(message: string): never {
  throw new Error(message);
}

function failForbidden(message = "Anda tidak berhak melihat konten ini."): never {
  const err = new Error(message);
  err.name = "FORBIDDEN";
  throw err;
}

function simSeedAllowed() {
  const url = typeof process !== "undefined" ? process.env.DATABASE_URL?.trim() : "";
  if (!url) return true;
  return process.env.AMG_SIM_SEED === "true";
}

export const getCompanies = createServerFn({ method: "GET" }).handler(async () => {
  return listCompanies();
});

export const getSetupState = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from profiles where role = 'admin' and is_active = true
  `;
  return { needsFirstAdmin: (rows[0]?.n ?? 0) === 0 };
});

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ name: z.string().trim().min(2).max(80) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const mine = await sql<{ user_id: string }>`
      select user_id from profiles where user_id = ${context.userId} limit 1
    `;
    if (mine[0]) fail("Profil sudah ada.");
    const u = await sql<{ email: string | null }>`
      select email from "user" where id = ${context.userId} limit 1
    `;
    const inserted = await sql.query<{ user_id: string }>(
      `insert into profiles (user_id, name, email, role, company_id, is_editor, is_kreator, is_sales, is_active, updated_at)
       select $1, $2, $3, 'admin', null, false, false, false, true, now()
       where not exists (select 1 from profiles where role = 'admin' and is_active = true)
       returning user_id`,
      [context.userId, data.name, u[0]?.email ?? null],
    );
    if (!inserted[0]) fail("Setup awal sudah selesai. Minta undangan Admin atau GM.");
    await sql`update "user" set name = ${data.name}, "updatedAt" = now() where id = ${context.userId}`;
    return { ok: true as const };
  });

export const ensureSimWorld = createServerFn({ method: "POST" }).handler(async () => {
  if (!simSeedAllowed()) {
    return { ok: false as const, skipped: true as const, accounts: [] as typeof SIM_ACCOUNTS };
  }
  const result = await seedSimWorld();
  return { ...result, skipped: false as const, accounts: SIM_ACCOUNTS };
});

export const getBootstrap = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(async ({ context }) => {
  try {
    const actor = await getActor(context.userId);
    const companies = await listCompanies();
    return { ok: true as const, actor, companies, landing: landingPath(actor) };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    const companies = await listCompanies();
    if (name === "INACTIVE") {
      return { ok: false as const, reason: "inactive" as const, companies };
    }
    return { ok: false as const, reason: "no_profile" as const, companies };
  }
});

export const createProfile = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().trim().min(2).max(80),
      kind: z.enum(["admin", "gm", "editor", "kreator", "sales"]),
      companyId: z.string().nullable(),
    }),
  )
  .handler(async () => {
    fail("Akses hanya lewat undangan Admin/GM.");
  });

export const listUsers = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const actor = await getActor(context.userId);
  if (!actor.isPlatform) fail("Tidak berhak.");
  const sql = await getSql();
  const rows = await sql<{
    user_id: string;
    name: string;
    email: string | null;
    role: string | null;
    company_id: string | null;
    company_name: string | null;
    is_editor: boolean;
    is_kreator: boolean;
    is_sales: boolean;
    is_active: boolean;
  }>`
    select p.user_id, p.name, p.email, p.role, p.company_id, c.name as company_name,
           p.is_editor, p.is_kreator, p.is_sales, p.is_active
    from profiles p
    left join companies c on c.id = p.company_id
    order by p.created_at desc
  `;
  return rows.map((r) => ({
    userId: r.user_id,
    name: r.name,
    email: r.email,
    role: r.role,
    companyId: r.company_id,
    companyName: r.company_name,
    isEditor: !!r.is_editor,
    isKreator: !!r.is_kreator,
    isSales: !!r.is_sales,
    isActive: r.is_active !== false,
  }));
});

export const updateUser = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(
    z.object({
      userId: z.string(),
      name: z.string().trim().min(2).max(80),
      isEditor: z.boolean(),
      isKreator: z.boolean(),
      isSales: z.boolean(),
      isActive: z.boolean(),
      companyId: z.string().nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isPlatform) fail("Tidak berhak.");
    const sql = await getSql();
    const target = await sql<{ role: string | null; company_id: string | null }>`
      select role, company_id from profiles where user_id = ${data.userId} limit 1
    `;
    const t = target[0];
    if (!t) fail("User tidak ditemukan.");
    if ((t.role === "admin" || t.role === "gm") && !actor.isAdmin) fail("GM tidak boleh mengubah Admin/GM.");
    if (t.role === "admin" && !data.isActive) {
      const others = await sql<{ n: number }>`
        select count(*)::int as n from profiles where role = 'admin' and is_active = true and user_id <> ${data.userId}
      `;
      if ((others[0]?.n ?? 0) < 1) fail("Minimal 1 Admin aktif.");
    }
    if (t.role === "admin" || t.role === "gm") {
      await sql`
        update profiles set name = ${data.name}, is_active = ${data.isActive}, updated_at = now()
        where user_id = ${data.userId}
      `;
      return { ok: true };
    }
    if (!data.isEditor && !data.isKreator && !data.isSales) fail("Pilih minimal satu hak akses.");
    if (t.company_id && data.companyId && t.company_id !== data.companyId) {
      const used = await sql<{ n: number }>`
        select (
          (select count(*) from content where created_by = ${data.userId} or assigned_to = ${data.userId}) +
          (select count(*) from lead where assigned_to = ${data.userId} or created_by = ${data.userId})
        )::int as n
      `;
      if ((used[0]?.n ?? 0) > 0) fail("Tidak bisa ganti brand: user sudah punya data. Nonaktifkan, lalu buat akun baru.");
    }
    await sql`
      update profiles
      set name = ${data.name},
          is_editor = ${data.isEditor},
          is_kreator = ${data.isKreator},
          is_sales = ${data.isSales},
          is_active = ${data.isActive},
          company_id = ${data.companyId ?? t.company_id},
          updated_at = now()
      where user_id = ${data.userId}
    `;
    return { ok: true };
  });

export const inviteUser = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().trim().min(2).max(80),
      email: z.string().trim().email(),
      kind: z.enum(["admin", "gm", "brand"]),
      companyId: z.string().nullable(),
      isEditor: z.boolean(),
      isKreator: z.boolean(),
      isSales: z.boolean(),
    }),
  )
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isPlatform) fail("Tidak berhak.");
    if (data.kind !== "brand" && !actor.isAdmin) failForbidden("Hanya Admin yang mengundang Admin/GM.");
    if (data.kind === "brand" && !data.companyId) fail("Pilih brand.");
    if (data.kind === "brand" && !data.isEditor && !data.isKreator && !data.isSales) fail("Pilih minimal satu hak akses.");
    const email = data.email.toLowerCase();
    const sql = await getSql();
    const taken = await sql<{ id: string }>`select id from "user" where email = ${email} limit 1`;
    if (taken[0]) fail("Email sudah terdaftar.");
    const takenP = await sql<{ user_id: string }>`select user_id from profiles where email = ${email} limit 1`;
    if (takenP[0]) fail("Email sudah terdaftar.");
    if (data.companyId) {
      const c = await sql`select id from companies where id = ${data.companyId} limit 1`;
      if (!c[0]) fail("Brand tidak valid.");
    }
    const userId = await ensureCredentialUser(sql, email, data.name, nid() + nid());
    const isPlatform = data.kind === "admin" || data.kind === "gm";
    await sql`
      insert into profiles (user_id, name, email, role, company_id, is_editor, is_kreator, is_sales, is_active, updated_at)
      values (
        ${userId},
        ${data.name},
        ${email},
        ${isPlatform ? data.kind : null},
        ${isPlatform ? null : data.companyId},
        ${isPlatform ? false : data.isEditor},
        ${isPlatform ? false : data.isKreator},
        ${isPlatform ? false : data.isSales},
        ${true},
        now()
      )
    `;
    const token = await issueAccessToken(sql, { userId, email, kind: "invite", createdBy: actor.userId });
    return {
      ok: true,
      message: "Undangan dibuat. Kirim tautan set kata sandi ke email user.",
      setupPath: `/reset-password?token=${token}`,
    };
  });

export const adminResetPassword = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) failForbidden("Hanya Admin yang mengirim reset password.");
    const sql = await getSql();
    const target = await sql<{ user_id: string; email: string | null; name: string }>`
      select user_id, email, name from profiles where user_id = ${data.userId} limit 1
    `;
    const t = target[0];
    if (!t?.email) fail("User tidak punya email.");
    const token = await issueAccessToken(sql, {
      userId: t.user_id,
      email: t.email,
      kind: "reset",
      createdBy: actor.userId,
    });
    return {
      ok: true,
      message: "Link reset dikirim ke email user.",
      setupPath: `/reset-password?token=${token}`,
    };
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().email() }))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    const sql = await getSql();
    const user = await sql<{ id: string }>`select id from "user" where email = ${email} limit 1`;
    if (!user[0]) return { ok: true as const };
    if (!simSeedAllowed()) return { ok: true as const };
    const token = await issueAccessToken(sql, { userId: user[0].id, email, kind: "reset" });
    return { ok: true as const, setupPath: `/reset-password?token=${token}` };
  });

export const completePasswordReset = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(16),
      password: z.string().min(8).max(80),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const row = await consumeAccessToken(sql, data.token);
    if (!row) fail("Tautan tidak valid atau kedaluwarsa.");
    await setCredentialPassword(sql, row.user_id, data.password);
    return { ok: true };
  });

export const getContentById = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    const sql = await getSql();
    const rows = await sql.query<{
      id: string;
      company_id: string;
      company_name: string;
      tanggal_tayang: string;
      status: string;
      platform: string;
      format: string;
      pillar_setting_id: string | null;
      pilar_name: string;
      tema: string;
      link_hasil: string | null;
      catatan: string | null;
      created_by: string;
      created_by_name: string;
      assigned_to: string | null;
      assigned_name: string | null;
      created_at: string;
    }>(
      `select ct.id, ct.company_id, co.name as company_name, ct.tanggal_tayang::text, ct.status, ct.platform,
              ct.format, ct.pillar_setting_id, ct.pilar_name, ct.tema, ct.link_hasil, ct.catatan,
              ct.created_by, coalesce(pe.name, 'User tidak aktif') as created_by_name,
              ct.assigned_to, pk.name as assigned_name, ct.created_at::text
       from content ct
       join companies co on co.id = ct.company_id
       left join profiles pe on pe.user_id = ct.created_by
       left join profiles pk on pk.user_id = ct.assigned_to
       where ct.id = $1`,
      [data.id],
    );
    const r = rows[0];
    if (!r) fail("Konten tidak ditemukan.");
    const allowed =
      actor.isPlatform ||
      (actor.isEditor && r.created_by === actor.userId) ||
      (actor.isKreator && r.assigned_to === actor.userId);
    if (!allowed) failForbidden();
    const acts = await sql<{
      id: string;
      action: string;
      old_value: string | null;
      new_value: string | null;
      notes: string | null;
      created_at: string;
      user_name: string;
    }>`
      select a.id, a.action, a.old_value, a.new_value, a.notes, a.created_at::text,
             coalesce(p.name, 'Sistem') as user_name
      from content_activity a
      left join profiles p on p.user_id = a.user_id
      where a.content_id = ${data.id}
      order by a.created_at desc
    `;
    return {
      content: {
        id: r.id,
        companyId: r.company_id,
        companyName: r.company_name,
        tanggalTayang: String(r.tanggal_tayang).slice(0, 10),
        status: r.status,
        platform: r.platform,
        format: r.format,
        pillarSettingId: r.pillar_setting_id,
        pilarName: r.pilar_name,
        tema: r.tema,
        linkHasil: r.link_hasil,
        catatan: r.catatan,
        createdBy: r.created_by,
        createdByName: r.created_by_name,
        assignedTo: r.assigned_to,
        assignedName: r.assigned_name,
        createdAt: r.created_at,
      },
      activities: acts,
    };
  });

export const listPillars = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(z.object({ companyId: z.string() }))
  .handler(async ({ context, data }) => {
    await getActor(context.userId);
    const sql = await getSql();
    return sql<{ id: string; pilar_name: string; sort_order: number }>`
      select id, pilar_name, sort_order from pillar_setting
      where company_id = ${data.companyId}
      order by sort_order asc
    `;
  });

export const listContent = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const actor = await getActor(context.userId);
  const sql = await getSql();
  let where = "true";
  const params: string[] = [];
  if (actor.isPlatform) {
    where = "true";
  } else if (actor.isEditor) {
    where = "ct.created_by = $1";
    params.push(actor.userId);
  } else {
    fail("Tidak berhak.");
  }
  const rows = await sql.query<{
    id: string;
    company_id: string;
    company_name: string;
    tanggal_tayang: string;
    status: string;
    platform: string;
    format: string;
    pillar_setting_id: string | null;
    pilar_name: string;
    tema: string;
    link_hasil: string | null;
    catatan: string | null;
    created_by: string;
    created_by_name: string;
    assigned_to: string | null;
    assigned_name: string | null;
    created_at: string;
  }>(
    `select ct.id, ct.company_id, co.name as company_name, ct.tanggal_tayang::text, ct.status, ct.platform,
            ct.format, ct.pillar_setting_id, ct.pilar_name, ct.tema, ct.link_hasil, ct.catatan,
            ct.created_by, coalesce(pe.name, 'User tidak aktif') as created_by_name,
            ct.assigned_to, pk.name as assigned_name, ct.created_at::text
     from content ct
     join companies co on co.id = ct.company_id
     left join profiles pe on pe.user_id = ct.created_by
     left join profiles pk on pk.user_id = ct.assigned_to
     where ${where}
     order by ct.tanggal_tayang desc, ct.created_at desc`,
    params,
  );
  return rows.map((r) => ({
    id: r.id,
    companyId: r.company_id,
    companyName: r.company_name,
    tanggalTayang: String(r.tanggal_tayang).slice(0, 10),
    status: r.status,
    platform: r.platform,
    format: r.format,
    pillarSettingId: r.pillar_setting_id,
    pilarName: r.pilar_name,
    tema: r.tema,
    linkHasil: r.link_hasil,
    catatan: r.catatan,
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    assignedTo: r.assigned_to,
    assignedName: r.assigned_name ? (r.assigned_name as string) : null,
    createdAt: r.created_at,
  }));
});

export const listTugas = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const actor = await getActor(context.userId);
  if (!actor.isKreator) fail("Tidak berhak.");
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    company_id: string;
    company_name: string;
    tanggal_tayang: string;
    status: string;
    platform: string;
    format: string;
    pillar_setting_id: string | null;
    pilar_name: string;
    tema: string;
    link_hasil: string | null;
    catatan: string | null;
    created_by: string;
    created_by_name: string;
    assigned_to: string | null;
    assigned_name: string | null;
    created_at: string;
  }>`
    select ct.id, ct.company_id, co.name as company_name, ct.tanggal_tayang::text, ct.status, ct.platform,
           ct.format, ct.pillar_setting_id, ct.pilar_name, ct.tema, ct.link_hasil, ct.catatan,
           ct.created_by, coalesce(pe.name, 'User tidak aktif') as created_by_name,
           ct.assigned_to, pk.name as assigned_name, ct.created_at::text
    from content ct
    join companies co on co.id = ct.company_id
    left join profiles pe on pe.user_id = ct.created_by
    left join profiles pk on pk.user_id = ct.assigned_to
    where ct.assigned_to = ${actor.userId}
    order by ct.tanggal_tayang desc
  `;
  return rows.map((r) => ({
    id: r.id,
    companyId: r.company_id,
    companyName: r.company_name,
    tanggalTayang: String(r.tanggal_tayang).slice(0, 10),
    status: r.status,
    platform: r.platform,
    format: r.format,
    pillarSettingId: r.pillar_setting_id,
    pilarName: r.pilar_name,
    tema: r.tema,
    linkHasil: r.link_hasil,
    catatan: r.catatan,
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    assignedTo: r.assigned_to,
    assignedName: r.assigned_name,
    createdAt: r.created_at,
  }));
});

export const listKreators = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(z.object({ companyId: z.string() }))
  .handler(async ({ context, data }) => {
    await getActor(context.userId);
    const sql = await getSql();
    return sql<{ user_id: string; name: string }>`
      select user_id, name from profiles
      where company_id = ${data.companyId} and is_kreator = true and is_active = true
      order by name
    `;
  });

export const listSalesUsers = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(z.object({ companyId: z.string() }))
  .handler(async ({ context, data }) => {
    await getActor(context.userId);
    const sql = await getSql();
    return sql<{ user_id: string; name: string }>`
      select user_id, name from profiles
      where company_id = ${data.companyId} and is_sales = true and is_active = true
      order by name
    `;
  });

const contentInput = z.object({
  tanggalTayang: z.string().min(8),
  platform: z.string(),
  format: z.string(),
  pillarSettingId: z.string(),
  tema: z.string().trim().min(1).max(200),
  assignedTo: z.string().nullable(),
  catatan: z.string().optional().nullable(),
});

export const createContent = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(contentInput)
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isEditor || !actor.companyId) fail("Hanya Editor yang boleh membuat konten.");
    const sql = await getSql();
    const co = await sql<{ platforms: string }>`select platforms from companies where id = ${actor.companyId}`;
    const platforms = parsePlatforms(co[0]?.platforms ?? "[]");
    if (!platforms.includes(data.platform)) fail("Platform tidak aktif di brand ini.");
    if (!(FORMATS[data.platform] ?? []).includes(data.format)) fail("Format tidak sesuai platform.");
    const pillar = await sql<{ id: string; pilar_name: string }>`
      select id, pilar_name from pillar_setting where id = ${data.pillarSettingId} and company_id = ${actor.companyId}
    `;
    if (!pillar[0]) fail("Pilar tidak valid.");
    if (data.assignedTo) {
      const k = await sql<{ user_id: string }>`
        select user_id from profiles
        where user_id = ${data.assignedTo} and is_kreator = true and is_active = true and company_id = ${actor.companyId}
      `;
      if (!k[0]) fail("Kreator tidak valid.");
    }
    const id = nid();
    await sql`
      insert into content (
        id, company_id, tanggal_tayang, status, platform, format, pillar_setting_id, pilar_name,
        tema, catatan, created_by, assigned_to, last_updated_by
      ) values (
        ${id}, ${actor.companyId}, ${data.tanggalTayang}::date, 'rencana', ${data.platform}, ${data.format},
        ${pillar[0].id}, ${pillar[0].pilar_name}, ${data.tema}, ${data.catatan ?? null},
        ${actor.userId}, ${data.assignedTo}, ${actor.userId}
      )
    `;
    await sql`
      insert into content_activity (id, content_id, user_id, action, new_value)
      values (${nid()}, ${id}, ${actor.userId}, 'create', ${data.tema})
    `;
    return { id };
  });

export const updateContent = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(contentInput.extend({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    const sql = await getSql();
    const row = await sql<{
      created_by: string;
      assigned_to: string | null;
      company_id: string;
      status: string;
    }>`select created_by, assigned_to, company_id, status from content where id = ${data.id}`;
    const c = row[0];
    if (!c) fail("Konten tidak ditemukan.");
    const canEdit = actor.isEditor && c.created_by === actor.userId;
    if (!canEdit) {
      if (!actor.isPlatform) fail("Anda tidak berhak mengubah konten ini.");
      const asg = c.assigned_to
        ? await sql<{ is_active: boolean | null }>`select is_active from profiles where user_id = ${c.assigned_to}`
        : [];
      const inactive = !c.assigned_to || asg[0]?.is_active === false;
      if (!inactive) fail("Override hanya jika belum di-assign atau Kreator nonaktif.");
    }
    const companyId = canEdit ? actor.companyId! : c.company_id;
    const pillar = await sql<{ id: string; pilar_name: string }>`
      select id, pilar_name from pillar_setting where id = ${data.pillarSettingId} and company_id = ${companyId}
    `;
    if (!pillar[0]) fail("Pilar tidak valid.");
    if (data.assignedTo) {
      const k = await sql<{ user_id: string }>`
        select user_id from profiles
        where user_id = ${data.assignedTo} and is_kreator = true and is_active = true and company_id = ${companyId}
      `;
      if (!k[0]) fail("Kreator tidak valid.");
    }
    const oldAssign = c.assigned_to;
    await sql`
      update content set
        tanggal_tayang = ${data.tanggalTayang}::date,
        platform = ${data.platform},
        format = ${data.format},
        pillar_setting_id = ${pillar[0].id},
        pilar_name = ${pillar[0].pilar_name},
        tema = ${data.tema},
        catatan = ${data.catatan ?? null},
        assigned_to = ${data.assignedTo},
        last_updated_by = ${actor.userId},
        last_updated_at = now()
      where id = ${data.id}
    `;
    if (oldAssign !== data.assignedTo) {
      await sql`
        insert into content_activity (id, content_id, user_id, action, old_value, new_value)
        values (${nid()}, ${data.id}, ${actor.userId}, 're-assign', ${oldAssign}, ${data.assignedTo})
      `;
    } else {
      await sql`
        insert into content_activity (id, content_id, user_id, action, notes)
        values (${nid()}, ${data.id}, ${actor.userId}, 'edit', ${data.tema})
      `;
    }
    return { ok: true };
  });

export const deleteContent = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    const sql = await getSql();
    const row = await sql<{ created_by: string; status: string }>`
      select created_by, status from content where id = ${data.id}
    `;
    const c = row[0];
    if (!c) fail("Konten tidak ditemukan.");
    if (!(actor.isEditor && c.created_by === actor.userId)) fail("Tidak berhak.");
    if (c.status !== "rencana" && c.status !== "draft") fail("Hanya Rencana/Draft yang bisa dihapus.");
    await sql`delete from content where id = ${data.id}`;
    return { ok: true };
  });

export const updateContentStatus = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string(),
      status: z.enum(CONTENT_STATUSES),
      linkHasil: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isKreator) fail("Hanya Kreator yang mengubah status.");
    const sql = await getSql();
    const row = await sql<{ assigned_to: string | null; status: string }>`
      select assigned_to, status from content where id = ${data.id}
    `;
    const c = row[0];
    if (!c || c.assigned_to !== actor.userId) fail("Bukan tugas Anda.");
    if (data.status === "publish") {
      const url = (data.linkHasil ?? "").trim();
      if (!/^https?:\/\//i.test(url)) fail("Publish wajib menempel tautan hasil (http/https).");
    }
    await sql`
      update content set
        status = ${data.status},
        link_hasil = ${data.status === "publish" ? (data.linkHasil ?? "").trim() : null},
        last_updated_by = ${actor.userId},
        last_updated_at = now()
      where id = ${data.id}
    `;
    await sql`
      insert into content_activity (id, content_id, user_id, action, old_value, new_value)
      values (${nid()}, ${data.id}, ${actor.userId}, 'status_update', ${c.status}, ${data.status})
    `;
    return { ok: true };
  });

export const listLeads = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(z.object({ archived: z.boolean().optional() }))
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isSales && !actor.isPlatform) fail("Tidak berhak.");
    const sql = await getSql();
    const arch = !!data.archived;
    const rows = await sql.query<{
      id: string;
      company_id: string;
      company_name: string;
      nama: string;
      pic_nama: string;
      pic_jabatan: string | null;
      hp: string;
      email: string | null;
      sumber: string;
      kategori: string;
      prioritas: string;
      brief: string | null;
      nilai: number;
      status: string;
      assigned_to: string;
      assigned_name: string;
      deal_at: string | null;
      deleted_at: string | null;
      nilai_final: number | null;
      jenis_kerjasama: string | null;
      periode: string | null;
      deliverables: string | null;
    }>(
      `select l.id, l.company_id, co.name as company_name, l.nama, l.pic_nama, l.pic_jabatan, l.hp, l.email,
              l.sumber, l.kategori, l.prioritas, l.brief, l.nilai::text::bigint as nilai, l.status, l.assigned_to,
              coalesce(ps.name, 'User tidak aktif') as assigned_name,
              l.deal_at::text, l.deleted_at::text,
              h.nilai_final::text::bigint as nilai_final, h.jenis_kerjasama, h.periode, h.deliverables
       from lead l
       join companies co on co.id = l.company_id
       left join profiles ps on ps.user_id = l.assigned_to
       left join lead_hasil_kerjasama h on h.lead_id = l.id
       where (${actor.isPlatform ? "true" : "l.assigned_to = $1"})
         and (${arch ? "l.deleted_at is not null" : "l.deleted_at is null"})
       order by l.last_updated_at desc`,
      actor.isPlatform ? [] : [actor.userId],
    );
    return rows.map((r) => ({
      id: r.id,
      companyId: r.company_id,
      companyName: r.company_name,
      nama: r.nama,
      picNama: r.pic_nama,
      picJabatan: r.pic_jabatan,
      hp: r.hp,
      email: r.email,
      sumber: r.sumber,
      kategori: r.kategori,
      prioritas: r.prioritas,
      brief: r.brief,
      nilai: num(r.nilai),
      status: r.status,
      assignedTo: r.assigned_to,
      assignedName: r.assigned_name,
      dealAt: r.deal_at,
      deletedAt: r.deleted_at,
      nilaiFinal: r.nilai_final == null ? null : num(r.nilai_final),
      jenisKerjasama: r.jenis_kerjasama,
      periode: r.periode,
      deliverables: r.deliverables,
    }));
  });

export const getLeadDetail = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    const sql = await getSql();
    const all = await sql.query<{
      id: string;
      company_id: string;
      company_name: string;
      nama: string;
      pic_nama: string;
      pic_jabatan: string | null;
      hp: string;
      email: string | null;
      sumber: string;
      kategori: string;
      prioritas: string;
      brief: string | null;
      nilai: number;
      status: string;
      assigned_to: string;
      assigned_name: string;
      deal_at: string | null;
      deleted_at: string | null;
      nilai_final: number | null;
      jenis_kerjasama: string | null;
      periode: string | null;
      deliverables: string | null;
    }>(
      `select l.id, l.company_id, co.name as company_name, l.nama, l.pic_nama, l.pic_jabatan, l.hp, l.email,
              l.sumber, l.kategori, l.prioritas, l.brief, l.nilai::text::bigint as nilai, l.status, l.assigned_to,
              coalesce(ps.name, 'User tidak aktif') as assigned_name,
              l.deal_at::text, l.deleted_at::text,
              h.nilai_final::text::bigint as nilai_final, h.jenis_kerjasama, h.periode, h.deliverables
       from lead l
       join companies co on co.id = l.company_id
       left join profiles ps on ps.user_id = l.assigned_to
       left join lead_hasil_kerjasama h on h.lead_id = l.id
       where l.id = $1`,
      [data.id],
    );
    const r = all[0];
    if (!r) fail("Lead tidak ditemukan.");
    if (!actor.isPlatform && r.assigned_to !== actor.userId) failForbidden();
    const acts = await sql<{
      id: string;
      jenis: string;
      catatan: string;
      tindak_lanjut: string | null;
      tindak_lanjut_tanggal: string | null;
      tanggal: string;
      user_name: string;
      created_at: string;
    }>`
      select a.id, a.jenis, a.catatan, a.tindak_lanjut, a.tindak_lanjut_tanggal::text, a.tanggal::text,
             coalesce(p.name, 'Sistem') as user_name, a.created_at::text
      from lead_activity a
      left join profiles p on p.user_id = a.user_id
      where a.lead_id = ${data.id}
      order by a.created_at desc
    `;
    return {
      lead: {
        id: r.id,
        companyId: r.company_id,
        companyName: r.company_name,
        nama: r.nama,
        picNama: r.pic_nama,
        picJabatan: r.pic_jabatan,
        hp: r.hp,
        email: r.email,
        sumber: r.sumber,
        kategori: r.kategori,
        prioritas: r.prioritas,
        brief: r.brief,
        nilai: num(r.nilai),
        status: r.status,
        assignedTo: r.assigned_to,
        assignedName: r.assigned_name,
        dealAt: r.deal_at,
        deletedAt: r.deleted_at,
        nilaiFinal: r.nilai_final == null ? null : num(r.nilai_final),
        jenisKerjasama: r.jenis_kerjasama,
        periode: r.periode,
        deliverables: r.deliverables,
      },
      activities: acts.map((a) => ({
        id: a.id,
        jenis: a.jenis,
        catatan: a.catatan,
        tindakLanjut: a.tindak_lanjut,
        tindakLanjutTanggal: a.tindak_lanjut_tanggal,
        tanggal: String(a.tanggal).slice(0, 10),
        userName: a.user_name,
        createdAt: a.created_at,
      })),
    };
  });

const leadInput = z.object({
  nama: z.string().trim().min(1).max(100),
  picNama: z.string().trim().min(1),
  picJabatan: z.string().optional().nullable(),
  hp: z.string().trim().min(6),
  email: z.string().optional().nullable(),
  sumber: z.enum(LEAD_SUMBER),
  kategori: z.enum(LEAD_KATEGORI),
  prioritas: z.enum(LEAD_PRIORITAS),
  brief: z.string().optional().nullable(),
  nilai: z.number().int().min(0),
});

export const createLead = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(leadInput)
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isSales || !actor.companyId) fail("Hanya Sales yang boleh membuat lead.");
    const sql = await getSql();
    const dup = await sql<{ n: number }>`
      select count(*)::int as n from lead
      where company_id = ${actor.companyId} and hp = ${data.hp} and deleted_at is null
    `;
    const warning = (dup[0]?.n ?? 0) > 0 ? "Nomor HP ini sudah ada di pipeline brand." : null;
    const id = nid();
    await sql`
      insert into lead (
        id, company_id, nama, pic_nama, pic_jabatan, hp, email, sumber, kategori, prioritas, brief, nilai,
        status, assigned_to, created_by, last_updated_by
      ) values (
        ${id}, ${actor.companyId}, ${data.nama}, ${data.picNama}, ${data.picJabatan ?? null}, ${data.hp},
        ${data.email || null}, ${data.sumber}, ${data.kategori}, ${data.prioritas}, ${data.brief ?? null},
        ${data.nilai}, 'baru', ${actor.userId}, ${actor.userId}, ${actor.userId}
      )
    `;
    await sql`
      insert into lead_activity (id, lead_id, user_id, jenis, catatan, tanggal)
      values (${nid()}, ${id}, ${actor.userId}, 'sistem', 'Lead dibuat', ${todayISO()}::date)
    `;
    return { id, warning };
  });

export const updateLead = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(
    leadInput.extend({
      id: z.string(),
      status: z.enum(LEAD_STATUSES),
      assignedTo: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    const sql = await getSql();
    const row = await sql<{ assigned_to: string; status: string; company_id: string; deal_at: string | null }>`
      select assigned_to, status, company_id, deal_at::text from lead where id = ${data.id} and deleted_at is null
    `;
    const l = row[0];
    if (!l) fail("Lead tidak ditemukan.");
    const can = actor.isSales && l.assigned_to === actor.userId;
    if (!can && !actor.isPlatform) fail("Tidak berhak.");
    if (actor.isPlatform && !can) {
      /* override limited: allow assign change only */
    }
    const nextAssign = data.assignedTo || l.assigned_to;
    if (nextAssign !== l.assigned_to) {
      const s = await sql<{ user_id: string }>`
        select user_id from profiles
        where user_id = ${nextAssign} and is_sales = true and is_active = true and company_id = ${l.company_id}
      `;
      if (!s[0]) fail("Sales tujuan tidak valid.");
    }
    const dealish = ["deal", "jalan", "selesai"].includes(data.status);
    const setDeal = dealish && !l.deal_at;
    await sql`
      update lead set
        nama = ${data.nama},
        pic_nama = ${data.picNama},
        pic_jabatan = ${data.picJabatan ?? null},
        hp = ${data.hp},
        email = ${data.email || null},
        sumber = ${data.sumber},
        kategori = ${data.kategori},
        prioritas = ${data.prioritas},
        brief = ${data.brief ?? null},
        nilai = ${data.nilai},
        status = ${data.status},
        assigned_to = ${nextAssign},
        deal_at = ${setDeal ? new Date().toISOString() : l.deal_at},
        last_updated_by = ${actor.userId},
        last_updated_at = now()
      where id = ${data.id}
    `;
    if (l.status !== data.status) {
      await sql`
        insert into lead_activity (id, lead_id, user_id, jenis, catatan, tanggal)
        values (${nid()}, ${data.id}, ${actor.userId}, 'sistem', ${"Status: " + l.status + " → " + data.status}, ${todayISO()}::date)
      `;
    }
    return { ok: true };
  });

export const moveLeadStatus = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(z.object({ id: z.string(), status: z.enum(LEAD_STATUSES) }))
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isSales && !actor.isPlatform) fail("Tidak berhak.");
    const sql = await getSql();
    const row = await sql<{ assigned_to: string; status: string; deal_at: string | null; deleted_at: string | null }>`
      select assigned_to, status, deal_at::text, deleted_at::text from lead where id = ${data.id}
    `;
    const l = row[0];
    if (!l || l.deleted_at) fail("Lead tidak ditemukan.");
    if (!(actor.isSales && l.assigned_to === actor.userId) && !actor.isPlatform) failForbidden();
    if (actor.isPlatform && l.assigned_to !== actor.userId) fail("Admin/GM tidak mengubah status lead.");
    const dealish = ["deal", "jalan", "selesai"].includes(data.status);
    const setDeal = dealish && !l.deal_at;
    await sql`
      update lead set
        status = ${data.status},
        deal_at = ${setDeal ? new Date().toISOString() : l.deal_at},
        last_updated_by = ${actor.userId},
        last_updated_at = now()
      where id = ${data.id}
    `;
    if (l.status !== data.status) {
      await sql`
        insert into lead_activity (id, lead_id, user_id, jenis, catatan, tanggal)
        values (${nid()}, ${data.id}, ${actor.userId}, 'sistem', ${"Status: " + l.status + " → " + data.status}, ${todayISO()}::date)
      `;
    }
    return { ok: true };
  });

export const addLeadActivity = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(
    z.object({
      leadId: z.string(),
      jenis: z.enum(ACTIVITY_JENIS),
      catatan: z.string().trim().min(1),
      tanggal: z.string().min(8),
      tindakLanjut: z.string().optional().nullable(),
      tindakLanjutTanggal: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isSales) fail("Hanya Sales yang menambah activity.");
    const sql = await getSql();
    const row = await sql<{ assigned_to: string; deleted_at: string | null }>`
      select assigned_to, deleted_at::text from lead where id = ${data.leadId}
    `;
    if (!row[0] || row[0].assigned_to !== actor.userId || row[0].deleted_at) fail("Tidak berhak.");
    await sql`
      insert into lead_activity (id, lead_id, user_id, jenis, catatan, tindak_lanjut, tindak_lanjut_tanggal, tanggal)
      values (
        ${nid()}, ${data.leadId}, ${actor.userId}, ${data.jenis}, ${data.catatan},
        ${data.tindakLanjut || null}, ${data.tindakLanjutTanggal || null}, ${data.tanggal}::date
      )
    `;
    return { ok: true };
  });

export const saveHasil = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(
    z.object({
      leadId: z.string(),
      jenisKerjasama: z.enum(JENIS_KERJASAMA),
      nilaiFinal: z.number().int().min(0),
      periode: z.string().optional().nullable(),
      deliverables: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isSales) fail("Hanya Sales.");
    const sql = await getSql();
    const row = await sql<{ assigned_to: string; status: string; deleted_at: string | null }>`
      select assigned_to, status, deleted_at::text from lead where id = ${data.leadId}
    `;
    const l = row[0];
    if (!l || l.assigned_to !== actor.userId) fail("Tidak berhak.");
    if (l.deleted_at) fail("Lead terarsip.");
    if (!["deal", "jalan", "selesai"].includes(l.status)) fail("Hasil kerja sama hanya untuk Deal/Jalan/Selesai.");
    const exists = await sql<{ id: string }>`select id from lead_hasil_kerjasama where lead_id = ${data.leadId}`;
    if (exists[0]) {
      await sql`
        update lead_hasil_kerjasama set
          jenis_kerjasama = ${data.jenisKerjasama},
          nilai_final = ${data.nilaiFinal},
          periode = ${data.periode ?? null},
          deliverables = ${data.deliverables ?? null},
          updated_at = now(),
          updated_by = ${actor.userId}
        where lead_id = ${data.leadId}
      `;
    } else {
      await sql`
        insert into lead_hasil_kerjasama (id, lead_id, jenis_kerjasama, nilai_final, periode, deliverables, updated_by)
        values (${nid()}, ${data.leadId}, ${data.jenisKerjasama}, ${data.nilaiFinal}, ${data.periode ?? null}, ${data.deliverables ?? null}, ${actor.userId})
      `;
    }
    return { ok: true };
  });

export const archiveLead = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(z.object({ id: z.string(), restore: z.boolean().optional() }))
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    const sql = await getSql();
    const row = await sql<{ assigned_to: string; status: string; deleted_at: string | null }>`
      select assigned_to, status, deleted_at::text from lead where id = ${data.id}
    `;
    const l = row[0];
    if (!l) fail("Lead tidak ditemukan.");
    const can = actor.isSales && l.assigned_to === actor.userId;
    if (!can && !actor.isPlatform) fail("Tidak berhak.");
    if (data.restore) {
      await sql`update lead set deleted_at = null, last_updated_by = ${actor.userId}, last_updated_at = now() where id = ${data.id}`;
      await sql`
        insert into lead_activity (id, lead_id, user_id, jenis, catatan, tanggal)
        values (${nid()}, ${data.id}, ${actor.userId}, 'sistem', 'Restore arsip', ${todayISO()}::date)
      `;
      return { ok: true };
    }
    if (!["baru", "dihubungi", "nego"].includes(l.status)) fail("Lead Deal/Jalan/Selesai tidak bisa diarsip.");
    await sql`update lead set deleted_at = now(), last_updated_by = ${actor.userId}, last_updated_at = now() where id = ${data.id}`;
    await sql`
      insert into lead_activity (id, lead_id, user_id, jenis, catatan, tanggal)
      values (${nid()}, ${data.id}, ${actor.userId}, 'sistem', 'Diarsipkan', ${todayISO()}::date)
    `;
    return { ok: true };
  });

export const getSettings = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const actor = await getActor(context.userId);
  if (!actor.isAdmin && !actor.isGm && !actor.isEditor) fail("Tidak berhak.");
  const sql = await getSql();
  const companies = await listCompanies();
  const pillars = await sql<{ id: string; company_id: string; pilar_name: string; sort_order: number }>`
    select id, company_id, pilar_name, sort_order from pillar_setting order by company_id, sort_order
  `;
  const kpis = await sql<{ id: string; company_id: string; platform: string; enabled_metrics: string }>`
    select id, company_id, platform, enabled_metrics from kpi_settings
  `;
  const thresholds = await sql<{ company_id: string; green_min: number; orange_min: number }>`
    select company_id, green_min::text::bigint as green_min, orange_min::text::bigint as orange_min from ranking_threshold
  `;
  const year = currentYearMonth().slice(0, 4);
  const targets = await sql<{ id: string; company_id: string; year_month: string; target_value: number }>`
    select id, company_id, year_month, target_value::text::bigint as target_value
    from sales_target
    where year_month like ${year + "%"}
    order by year_month
  `;
  return {
    actor,
    companies,
    pillars,
    kpis: kpis.map((k) => ({ ...k, enabled: parsePlatforms(k.enabled_metrics) })),
    thresholds: thresholds.map((t) => ({
      companyId: t.company_id,
      greenMin: num(t.green_min),
      orangeMin: num(t.orange_min),
    })),
    targets: targets.map((t) => ({
      companyId: t.company_id,
      yearMonth: t.year_month,
      value: num(t.target_value),
    })),
    metrics: METRICS,
  };
});

export const savePillar = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(
    z.object({
      action: z.enum(["add", "delete", "up", "down"]),
      companyId: z.string(),
      id: z.string().optional(),
      name: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) fail("Hanya Admin.");
    const sql = await getSql();
    if (data.action === "add") {
      const n = (data.name ?? "").trim();
      if (!n) fail("Nama pilar wajib.");
      const max = await sql<{ m: number }>`select coalesce(max(sort_order),0)::int as m from pillar_setting where company_id = ${data.companyId}`;
      await sql`
        insert into pillar_setting (id, company_id, pilar_name, sort_order)
        values (${nid()}, ${data.companyId}, ${n}, ${(max[0]?.m ?? 0) + 1})
      `;
      return { ok: true };
    }
    if (!data.id) fail("ID pilar wajib.");
    const cur = await sql<{ id: string; sort_order: number }>`
      select id, sort_order from pillar_setting where id = ${data.id} and company_id = ${data.companyId}
    `;
    if (!cur[0]) fail("Pilar tidak ada.");
    if (data.action === "delete") {
      await sql`update content set pillar_setting_id = null where pillar_setting_id = ${data.id}`;
      await sql`delete from pillar_setting where id = ${data.id}`;
      return { ok: true };
    }
    const dir = data.action === "up" ? -1 : 1;
    const other = await sql<{ id: string; sort_order: number }>`
      select id, sort_order from pillar_setting
      where company_id = ${data.companyId} and sort_order = ${cur[0].sort_order + dir}
    `;
    if (!other[0]) return { ok: true };
    await sql`update pillar_setting set sort_order = ${other[0].sort_order} where id = ${cur[0].id}`;
    await sql`update pillar_setting set sort_order = ${cur[0].sort_order} where id = ${other[0].id}`;
    return { ok: true };
  });

export const saveKpi = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(z.object({ companyId: z.string(), platform: z.string(), metrics: z.array(z.string()) }))
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) fail("Hanya Admin.");
    const sql = await getSql();
    const json = JSON.stringify(data.metrics);
    const ex = await sql<{ id: string }>`
      select id from kpi_settings where company_id = ${data.companyId} and platform = ${data.platform}
    `;
    if (ex[0]) {
      await sql`update kpi_settings set enabled_metrics = ${json}, updated_at = now() where id = ${ex[0].id}`;
    } else {
      await sql`
        insert into kpi_settings (id, company_id, platform, enabled_metrics)
        values (${nid()}, ${data.companyId}, ${data.platform}, ${json})
      `;
    }
    return { ok: true };
  });

export const saveTarget = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(z.object({ companyId: z.string(), yearMonth: z.string(), value: z.number().int().min(0) }))
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) fail("Hanya Admin.");
    const sql = await getSql();
    const ex = await sql<{ id: string }>`
      select id from sales_target where company_id = ${data.companyId} and year_month = ${data.yearMonth}
    `;
    if (ex[0]) {
      await sql`update sales_target set target_value = ${data.value}, updated_at = now(), updated_by = ${actor.userId} where id = ${ex[0].id}`;
    } else {
      await sql`
        insert into sales_target (id, company_id, year_month, target_value, updated_by)
        values (${nid()}, ${data.companyId}, ${data.yearMonth}, ${data.value}, ${actor.userId})
      `;
    }
    return { ok: true };
  });

export const saveThreshold = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(z.object({ companyId: z.string(), greenMin: z.number().int().min(0), orangeMin: z.number().int().min(0) }))
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) fail("Hanya Admin.");
    if (data.greenMin <= data.orangeMin) fail("Ambang hijau harus lebih besar dari oranye.");
    const sql = await getSql();
    await sql`
      insert into ranking_threshold (company_id, green_min, orange_min)
      values (${data.companyId}, ${data.greenMin}, ${data.orangeMin})
      on conflict (company_id) do update set green_min = ${data.greenMin}, orange_min = ${data.orangeMin}
    `;
    return { ok: true };
  });

export const getBreakdown = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(z.object({ yearMonth: z.string() }))
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isPlatform) fail("Tidak berhak.");
    const sql = await getSql();
    const companies = await listCompanies();
    const targets = await sql<{ company_id: string; target_value: number }>`
      select company_id, target_value::text::bigint as target_value from sales_target where year_month = ${data.yearMonth}
    `;
    const alloc = await sql<{ company_id: string; sales_user_id: string; allocated_value: number; name: string }>`
      select b.company_id, b.sales_user_id, b.allocated_value::text::bigint as allocated_value, coalesce(p.name,'User tidak aktif') as name
      from sales_breakdown b
      left join profiles p on p.user_id = b.sales_user_id
      where b.year_month = ${data.yearMonth}
    `;
    const sales = await sql<{ user_id: string; name: string; company_id: string }>`
      select user_id, name, company_id from profiles where is_sales = true and is_active = true
    `;
    return {
      actor,
      companies,
      targets: Object.fromEntries(targets.map((t) => [t.company_id, num(t.target_value)])),
      alloc,
      sales,
    };
  });

export const saveBreakdown = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(
    z.object({
      yearMonth: z.string(),
      rows: z.array(z.object({ companyId: z.string(), salesUserId: z.string(), value: z.number().int().min(0) })),
    }),
  )
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isGm) fail("Hanya GM yang menyimpan breakdown.");
    const sql = await getSql();
    for (const r of data.rows) {
      const ex = await sql<{ id: string }>`
        select id from sales_breakdown
        where company_id = ${r.companyId} and year_month = ${data.yearMonth} and sales_user_id = ${r.salesUserId}
      `;
      if (ex[0]) {
        await sql`
          update sales_breakdown set allocated_value = ${r.value}, updated_at = now(), updated_by = ${actor.userId}
          where id = ${ex[0].id}
        `;
      } else {
        await sql`
          insert into sales_breakdown (id, company_id, year_month, sales_user_id, allocated_value, updated_by)
          values (${nid()}, ${r.companyId}, ${data.yearMonth}, ${r.salesUserId}, ${r.value}, ${actor.userId})
        `;
      }
    }
    return { ok: true };
  });

export const getRanking = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(z.object({ yearMonth: z.string() }))
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isPlatform && !actor.isSales) fail("Tidak berhak.");
    const sql = await getSql();
    const companies = await listCompanies();
    const viewCompanies = actor.isPlatform ? companies : companies.filter((c) => c.id === actor.companyId);
    const thresholds = await sql<{ company_id: string; green_min: number; orange_min: number }>`
      select company_id, green_min::text::bigint as green_min, orange_min::text::bigint as orange_min from ranking_threshold
    `;
    const sales = await sql<{ user_id: string; name: string; company_id: string }>`
      select user_id, name, company_id from profiles where is_sales = true
    `;
    const deals = await sql<{ assigned_to: string; company_id: string; total: number; cnt: number }>`
      select l.assigned_to, l.company_id,
             coalesce(sum(coalesce(h.nilai_final, l.nilai)),0)::text::bigint as total,
             count(*)::int as cnt
      from lead l
      left join lead_hasil_kerjasama h on h.lead_id = l.id
      where l.deleted_at is null
        and l.status in ('deal','jalan','selesai')
        and to_char(l.deal_at at time zone 'Asia/Jakarta', 'YYYY-MM') = ${data.yearMonth}
      group by l.assigned_to, l.company_id
    `;
    const breakdown = await sql<{ company_id: string; sales_user_id: string; allocated_value: number }>`
      select company_id, sales_user_id, allocated_value::text::bigint as allocated_value
      from sales_breakdown where year_month = ${data.yearMonth}
    `;
    const cards = viewCompanies.map((c) => {
      const th = thresholds.find((t) => t.company_id === c.id);
      const people = sales.filter((s) => s.company_id === c.id);
      const rows = people
        .map((s) => {
          const d = deals.find((x) => x.assigned_to === s.user_id && x.company_id === c.id);
          const t = breakdown.find((b) => b.sales_user_id === s.user_id && b.company_id === c.id);
          return {
            userId: s.user_id,
            name: s.name,
            total: num(d?.total),
            count: d?.cnt ?? 0,
            target: t ? num(t.allocated_value) : null,
            isMe: s.user_id === actor.userId,
          };
        })
        .sort((a, b) => b.total - a.total || b.count - a.count || a.name.localeCompare(b.name));
      return {
        company: c,
        greenMin: num(th?.green_min ?? 100000000),
        orangeMin: num(th?.orange_min ?? 50000000),
        rows,
      };
    });
    return { actor, yearMonth: data.yearMonth, cards };
  });

export const seedDemo = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const actor = await getActor(context.userId);
  const sql = await getSql();
  const ym = currentYearMonth();
  const t = todayISO();

  if (actor.isEditor && actor.companyId) {
    const pillars = await sql<{ id: string; pilar_name: string }>`
      select id, pilar_name from pillar_setting where company_id = ${actor.companyId} order by sort_order limit 2
    `;
    const k = await sql<{ user_id: string }>`
      select user_id from profiles where company_id = ${actor.companyId} and is_kreator = true and is_active = true limit 1
    `;
    const assign = k[0]?.user_id ?? null;
    const samples = [
      { tema: "Macet Bundaran Tugu, sudut yang jarang diambil", platform: "instagram", format: "Reel", status: "rencana" },
      { tema: "Kopi Kayutangan sebelum maghrib", platform: "tiktok", format: "Video Short", status: "draft" },
    ];
    for (const s of samples) {
      const id = nid();
      await sql`
        insert into content (id, company_id, tanggal_tayang, status, platform, format, pillar_setting_id, pilar_name, tema, catatan, created_by, assigned_to, last_updated_by)
        values (${id}, ${actor.companyId}, ${t}::date, ${s.status}, ${s.platform}, ${s.format}, ${pillars[0]?.id ?? null}, ${pillars[0]?.pilar_name ?? "Umum"}, ${s.tema}, ${"Brief: ambil golden hour, hindari logo merek."}, ${actor.userId}, ${assign}, ${actor.userId})
      `;
    }
  }

  if (actor.isSales && actor.companyId) {
    const samples = [
      { nama: "Bakso President", status: "baru", nilai: 25000000, kat: "Kolaborasi Konten", prio: "Tinggi", hp: "081311110001" },
      { nama: "Hotel Tugu", status: "dihubungi", nilai: 80000000, kat: "Event", prio: "Tinggi", hp: "081311110002" },
      { nama: "Cokelat Klasik", status: "nego", nilai: 15000000, kat: "Sponsored Post", prio: "Sedang", hp: "081311110003" },
      { nama: "Orooro Cafe", status: "deal", nilai: 45000000, kat: "Iklan", prio: "Sedang", hp: "081311110004" },
      { nama: "Kampung Warna", status: "jalan", nilai: 60000000, kat: "Event", prio: "Tinggi", hp: "081311110005" },
      { nama: "Toko Oen", status: "selesai", nilai: 75000000, kat: "Kolaborasi Konten", prio: "Rendah", hp: "081311110006" },
    ];
    for (const s of samples) {
      const id = nid();
      const dealish = ["deal", "jalan", "selesai"].includes(s.status);
      await sql`
        insert into lead (id, company_id, nama, pic_nama, pic_jabatan, hp, sumber, kategori, prioritas, brief, nilai, status, assigned_to, created_by, last_updated_by, deal_at)
        values (
          ${id}, ${actor.companyId}, ${s.nama}, ${"Bu Rina"}, ${"Marketing"}, ${s.hp},
          ${"Referral"}, ${s.kat}, ${s.prio}, ${"Butuh 3 reels + 1 event booth."}, ${s.nilai}, ${s.status},
          ${actor.userId}, ${actor.userId}, ${actor.userId}, ${dealish ? todayISO() : null}
        )
      `;
      if (dealish) {
        const final = s.status === "selesai" ? 75000000 : s.nilai;
        await sql`
          insert into lead_hasil_kerjasama (id, lead_id, jenis_kerjasama, nilai_final, periode, deliverables, updated_by)
          values (${nid()}, ${id}, ${"Berbayar"}, ${final}, ${"Sep 2026"}, ${"3 reels + 1 story sequence"}, ${actor.userId})
        `;
      }
    }
  }

  if (actor.isAdmin) {
    const companies = await listCompanies();
    for (const c of companies) {
      await sql`
        insert into sales_target (id, company_id, year_month, target_value, updated_by)
        values (${nid()}, ${c.id}, ${ym}, ${500000000}, ${actor.userId})
        on conflict (company_id, year_month) do nothing
      `;
    }
  }

  return { ok: true };
});

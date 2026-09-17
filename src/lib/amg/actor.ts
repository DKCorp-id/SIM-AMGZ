import { getSql } from "@/lib/db";
import { asActor, type Actor, type Company, type Profile } from "./types";
import { parsePlatforms } from "./format";
import { upsertOfficialBrands } from "./lite-seed";

export async function getActor(userId: string): Promise<Actor> {
  const sql = await getSql();
  const rows = await sql<{
    user_id: string;
    name: string;
    email: string | null;
    role: string | null;
    company_id: string | null;
    is_editor: boolean;
    is_kreator: boolean;
    is_sales: boolean;
    is_active: boolean;
  }>`
    select user_id, name, email, role, company_id,
           is_editor, is_kreator, is_sales, is_active
    from profiles
    where user_id = ${userId}
    limit 1
  `;
  const r = rows[0];
  if (!r) {
    const err = new Error("NO_PROFILE");
    err.name = "NO_PROFILE";
    throw err;
  }
  let companyName: string | null = null;
  if (r.company_id) {
    try {
      const c = await sql<{ name: string }>`
        select name from companies where id = ${r.company_id} limit 1
      `;
      companyName = c[0]?.name ?? null;
    } catch {
      companyName = null;
    }
  }
  const p: Profile = {
    userId: r.user_id,
    name: r.name,
    email: r.email,
    role: r.role === "admin" || r.role === "gm" ? r.role : null,
    companyId: r.company_id,
    isEditor: !!r.is_editor,
    isKreator: !!r.is_kreator,
    isSales: !!r.is_sales,
    isActive: r.is_active !== false,
    companyName,
  };
  if (!p.isActive) {
    const err = new Error("INACTIVE");
    err.name = "INACTIVE";
    throw err;
  }
  return asActor(p);
}

async function ensureTables(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql.query(`
    create table if not exists companies (
      id text primary key,
      name text not null,
      slug text not null unique,
      platforms text not null,
      is_active boolean not null default true,
      created_at timestamptz not null default now()
    )
  `);
  await sql.query(`
    create table if not exists profiles (
      user_id text primary key,
      name text not null,
      email text,
      role text,
      company_id text,
      is_editor boolean not null default false,
      is_kreator boolean not null default false,
      is_sales boolean not null default false,
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  try {
    await sql.query("alter table if exists profiles disable row level security");
    await sql.query("alter table if exists companies disable row level security");
  } catch {
    /* RLS ops optional */
  }
  await upsertOfficialBrands();
}

/**
 * Hubungkan sesi login ke profil yang sudah ada, atau buat Admin pertama
 * jika database masih kosong. Tidak menaikkan Editor/Kreator/Sales jadi Admin.
 */
export async function ensureAdminProfile(userId: string, emailHint?: string | null) {
  const sql = await getSql();
  await ensureTables(sql);

  const mine = await sql<{ user_id: string }>`
    select user_id from profiles where user_id = ${userId} limit 1
  `;
  if (mine[0]) return;

  const u = await sql<{ email: string | null; name: string | null }>`
    select email, name from "user" where id = ${userId} limit 1
  `;
  const email = (emailHint ?? u[0]?.email ?? "").trim() || null;
  const name = (u[0]?.name ?? "Admin").trim() || "Admin";

  if (email) {
    await sql`
      update profiles
      set user_id = ${userId}, name = ${name}, email = ${email}, is_active = true, updated_at = now()
      where lower(email) = lower(${email})
    `;
    const relinked = await sql<{ user_id: string }>`
      select user_id from profiles where user_id = ${userId} limit 1
    `;
    if (relinked[0]) return;
  }

  const adminCount = await sql<{ n: number }>`
    select count(*)::int as n from profiles where role = 'admin' and is_active = true
  `;
  if ((adminCount[0]?.n ?? 0) > 0) {
    const err = new Error("NO_PROFILE");
    err.name = "NO_PROFILE";
    throw err;
  }

  await sql`
    insert into profiles (
      user_id, name, email, role, company_id,
      is_editor, is_kreator, is_sales, is_active, updated_at
    )
    values (
      ${userId}, ${name}, ${email}, 'admin', null,
      false, false, false, true, now()
    )
    on conflict (user_id) do update
    set role = 'admin', is_active = true, name = excluded.name, email = excluded.email, updated_at = now()
  `;
}

export async function listCompanies(): Promise<Company[]> {
  const sql = await getSql();
  const rows = await sql<{ id: string; name: string; slug: string; platforms: string }>`
    select id, name, slug, platforms from companies where is_active = true order by name
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    platforms: parsePlatforms(r.platforms),
  }));
}

export function profileName(sqlRows: { name: string; is_active?: boolean } | undefined, fallback = "User tidak aktif") {
  if (!sqlRows) return fallback;
  if (sqlRows.is_active === false) return `${sqlRows.name} (tidak aktif)`;
  return sqlRows.name;
}

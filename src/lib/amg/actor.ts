import { getSql } from "@/lib/db";
import { asActor, type Actor, type Company, type Profile } from "./types";
import { parsePlatforms } from "./format";

export async function getActor(userId: string): Promise<Actor> {
  const sql = await getSql();
  await ensureAdminProfile(userId);
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
    company_name: string | null;
  }>`
    select p.user_id, p.name, p.email, p.role, p.company_id,
           p.is_editor, p.is_kreator, p.is_sales, p.is_active,
           c.name as company_name
    from profiles p
    left join companies c on c.id = p.company_id
    where p.user_id = ${userId}
    limit 1
  `;
  const r = rows[0];
  if (!r) {
    const err = new Error("NO_PROFILE");
    err.name = "NO_PROFILE";
    throw err;
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
    companyName: r.company_name,
  };
  if (!p.isActive) {
    const err = new Error("INACTIVE");
    err.name = "INACTIVE";
    throw err;
  }
  return asActor(p);
}

export async function ensureAdminProfile(userId: string, emailHint?: string | null) {
  const sql = await getSql();
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
  }

  const again = await sql<{ user_id: string }>`
    select user_id from profiles where user_id = ${userId} limit 1
  `;
  if (again[0]) return;

  const admins = await sql<{ user_id: string }>`
    select user_id
    from profiles
    where role = 'admin' and is_active = true
    order by created_at asc
    limit 1
  `;
  if (admins[0] && admins[0].user_id !== userId) {
    await sql`
      update profiles
      set user_id = ${userId}, email = coalesce(${email}, email), name = ${name}, is_active = true, updated_at = now()
      where user_id = ${admins[0].user_id}
    `;
    const linked = await sql<{ user_id: string }>`
      select user_id from profiles where user_id = ${userId} limit 1
    `;
    if (linked[0]) return;
  }

  await sql`
    insert into companies (id, name, slug, platforms, is_active)
    values
      ('amazing-malang', 'Amazing Malang', 'amazing-malang', 'instagram,tiktok,facebook', true),
      ('ame', 'AME', 'ame', 'instagram,tiktok', true),
      ('mata-malang', 'Mata Malang', 'mata-malang', 'instagram,tiktok,youtube', true),
      ('salt-and-sour', 'Salt & Sour', 'salt-and-sour', 'instagram,tiktok', true)
    on conflict (id) do nothing
  `;

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

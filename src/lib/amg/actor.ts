import { getSql } from "@/lib/db";
import { asActor, type Actor, type Company, type Profile } from "./types";
import { parsePlatforms } from "./format";

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
  let r = rows[0];
  if (!r) {
    const u = await sql<{ email: string | null }>`
      select email from "user" where id = ${userId} limit 1
    `;
    const email = u[0]?.email?.trim();
    if (email) {
      await sql`
        update profiles
        set user_id = ${userId}, updated_at = now()
        where lower(email) = lower(${email})
          and user_id <> ${userId}
      `;
      const again = await sql<typeof rows[0]>`
        select p.user_id, p.name, p.email, p.role, p.company_id,
               p.is_editor, p.is_kreator, p.is_sales, p.is_active,
               c.name as company_name
        from profiles p
        left join companies c on c.id = p.company_id
        where p.user_id = ${userId}
        limit 1
      `;
      r = again[0];
    }
  }
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

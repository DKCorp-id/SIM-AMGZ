import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { getSql } from "@/lib/db";
import { nid } from "./constants";

type Sql = Awaited<ReturnType<typeof getSql>>;

export function newAccessToken() {
  return randomBytes(32).toString("hex");
}

export function hashAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function ensureCredentialUser(
  sql: Sql,
  email: string,
  name: string,
  passwordPlain: string,
): Promise<string> {
  const found = await sql<{ id: string }>`select id from "user" where email = ${email} limit 1`;
  if (found[0]) return found[0].id;
  const id = nid();
  const passwordHash = await hashPassword(passwordPlain);
  await sql`
    insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    values (${id}, ${name}, ${email}, ${true}, now(), now())
  `;
  await sql`
    insert into "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    values (${nid()}, ${id}, ${"credential"}, ${id}, ${passwordHash}, now(), now())
  `;
  return id;
}

export async function setCredentialPassword(sql: Sql, userId: string, passwordPlain: string) {
  const passwordHash = await hashPassword(passwordPlain);
  const acc = await sql<{ id: string }>`
    select id from "account" where "userId" = ${userId} and "providerId" = ${"credential"} limit 1
  `;
  if (acc[0]) {
    await sql`update "account" set password = ${passwordHash}, "updatedAt" = now() where id = ${acc[0].id}`;
    return;
  }
  await sql`
    insert into "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    values (${nid()}, ${userId}, ${"credential"}, ${userId}, ${passwordHash}, now(), now())
  `;
}

export async function issueAccessToken(
  sql: Sql,
  opts: { userId: string; email: string; kind: "invite" | "reset"; createdBy?: string | null },
) {
  const token = newAccessToken();
  const tokenHash = hashAccessToken(token);
  await sql`
    insert into access_token (id, user_id, email, token_hash, kind, expires_at, created_by)
    values (
      ${nid()}, ${opts.userId}, ${opts.email}, ${tokenHash}, ${opts.kind},
      now() + interval '48 hours', ${opts.createdBy ?? null}
    )
  `;
  return token;
}

export async function consumeAccessToken(sql: Sql, token: string) {
  const tokenHash = hashAccessToken(token);
  const rows = await sql<{
    id: string;
    user_id: string;
    email: string;
    used_at: string | null;
    expires_at: string;
  }>`
    select id, user_id, email, used_at::text, expires_at::text
    from access_token
    where token_hash = ${tokenHash}
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  await sql`update access_token set used_at = now() where id = ${row.id}`;
  return row;
}

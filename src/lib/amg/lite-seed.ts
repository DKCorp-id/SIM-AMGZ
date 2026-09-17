import { getSql } from "@/lib/db";
import { currentYearMonth, nid, todayISO } from "./constants";

export const SIM_TAG = "[SIMULASI]";

const BRANDS: { id: string; name: string; slug: string; platforms: string }[] = [
  {
    id: "amazing-malang",
    name: "Amazing Malang",
    slug: "amazing-malang",
    platforms: '["instagram","tiktok","facebook","threads","youtube"]',
  },
  {
    id: "ame",
    name: "Amazing Malang Eats",
    slug: "ame",
    platforms: '["instagram","tiktok","facebook","threads"]',
  },
  {
    id: "mata-malang",
    name: "Mata Malang",
    slug: "mata-malang",
    platforms: '["instagram","tiktok","facebook","threads"]',
  },
  {
    id: "sam-ongis",
    name: "Sam Ongis",
    slug: "sam-ongis",
    platforms: '["instagram","tiktok","facebook","threads"]',
  },
];

export async function upsertOfficialBrands() {
  const sql = await getSql();
  for (const b of BRANDS) {
    await sql.query(
      `insert into companies (id, name, slug, platforms, is_active)
       values ($1, $2, $3, $4, true)
       on conflict (id) do update set name = excluded.name, slug = excluded.slug, platforms = excluded.platforms, is_active = true`,
      [b.id, b.name, b.slug, b.platforms],
    );
  }
  await dropSaltAndSour(sql);
}

async function dropSaltAndSour(sql: Awaited<ReturnType<typeof getSql>>) {
  const gone = await sql<{ id: string }>`select id from companies where id = ${"salt-and-sour"} limit 1`;
  if (!gone[0]) return;
  const steps = [
    `delete from content_activity where content_id in (select id from content where company_id = 'salt-and-sour')`,
    `delete from content where company_id = 'salt-and-sour'`,
    `delete from lead_activity where lead_id in (select id from lead where company_id = 'salt-and-sour')`,
    `delete from lead_hasil_kerjasama where lead_id in (select id from lead where company_id = 'salt-and-sour')`,
    `delete from lead where company_id = 'salt-and-sour'`,
    `delete from sales_breakdown where company_id = 'salt-and-sour'`,
    `delete from sales_target where company_id = 'salt-and-sour'`,
    `delete from ranking_threshold where company_id = 'salt-and-sour'`,
    `delete from kpi_settings where company_id = 'salt-and-sour'`,
    `delete from pillar_setting where company_id = 'salt-and-sour'`,
    `update profiles set company_id = null where company_id = 'salt-and-sour'`,
    `delete from companies where id = 'salt-and-sour'`,
  ];
  for (const q of steps) {
    try {
      await sql.query(q);
    } catch {
      /* tabel atau baris mungkin belum ada */
    }
  }
}

export async function seedLiteIfEmpty(adminUserId: string) {
  const sql = await getSql();
  await upsertOfficialBrands();
  const n = await sql<{ n: number }>`select count(*)::int as n from content`;
  if ((n[0]?.n ?? 0) > 0) return { ok: true as const, seeded: false as const };
  await seedLiteWorld(adminUserId);
  return { ok: true as const, seeded: true as const };
}

export async function seedLiteWorld(adminUserId: string) {
  const sql = await getSql();
  await upsertOfficialBrands();
  const t = todayISO();
  const ym = currentYearMonth();
  const note = `${SIM_TAG} data latihan — hapus dari Pengaturan jika sudah tidak dipakai.`;

  const pillars: [string, string, string, number][] = [
    ["am-1", "amazing-malang", "Cerita Kota", 1],
    ["am-2", "amazing-malang", "Identitas Malang", 2],
    ["ame-1", "ame", "Cita Rasa", 1],
    ["mm-1", "mata-malang", "Sudut Pandang Warga", 1],
    ["so-1", "sam-ongis", "Komedi Harian", 1],
    ["so-2", "sam-ongis", "Observasi Sosial", 2],
  ];
  for (const [id, companyId, name, order] of pillars) {
    await sql.query(
      `insert into pillar_setting (id, company_id, pilar_name, sort_order)
       values ($1, $2, $3, $4)
       on conflict (id) do nothing`,
      [id, companyId, name, order],
    );
  }

  for (const b of BRANDS) {
    await sql.query(
      `insert into ranking_threshold (company_id, green_min, orange_min)
       values ($1, 100000000, 50000000)
       on conflict (company_id) do nothing`,
      [b.id],
    );
    await sql.query(
      `insert into sales_target (id, company_id, year_month, target_value, updated_by)
       values ($1, $2, $3, $4, $5)
       on conflict (company_id, year_month) do nothing`,
      [nid(), b.id, ym, b.id === "amazing-malang" ? 500_000_000 : 200_000_000, adminUserId],
    );
  }

  const contents: { companyId: string; pilar: string; pilarName: string; tema: string; platform: string; format: string; status: string; link: string | null }[] = [
    {
      companyId: "amazing-malang",
      pilar: "am-1",
      pilarName: "Cerita Kota",
      tema: "Macet Bundaran Tugu, sudut yang jarang diambil",
      platform: "instagram",
      format: "Reel",
      status: "rencana",
      link: null,
    },
    {
      companyId: "amazing-malang",
      pilar: "am-2",
      pilarName: "Identitas Malang",
      tema: "Kopi Kayutangan sebelum maghrib",
      platform: "tiktok",
      format: "Video Short",
      status: "draft",
      link: null,
    },
    {
      companyId: "amazing-malang",
      pilar: "am-1",
      pilarName: "Cerita Kota",
      tema: "Sunrise Jodipan dari seberang sungai",
      platform: "instagram",
      format: "Reel",
      status: "publish",
      link: "https://www.instagram.com/p/simulasi-amg/",
    },
    {
      companyId: "ame",
      pilar: "ame-1",
      pilarName: "Cita Rasa",
      tema: "Bakso Urat langganan mahasiswa",
      platform: "tiktok",
      format: "Video Short",
      status: "rencana",
      link: null,
    },
    {
      companyId: "sam-ongis",
      pilar: "so-1",
      pilarName: "Komedi Harian",
      tema: "Antrian Samsat yang jadi stand-up",
      platform: "instagram",
      format: "Reel",
      status: "draft",
      link: null,
    },
  ];
  for (const c of contents) {
    const exists = await sql<{ n: number }>`
      select count(*)::int as n from content where tema = ${c.tema} and company_id = ${c.companyId}
    `;
    if ((exists[0]?.n ?? 0) > 0) continue;
    await sql.query(
      `insert into content (id, company_id, tanggal_tayang, status, platform, format, pillar_setting_id, pilar_name, tema, link_hasil, catatan, created_by, assigned_to, last_updated_by)
       values ($1,$2,$3::date,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$12)`,
      [
        nid(),
        c.companyId,
        t,
        c.status,
        c.platform,
        c.format,
        c.pilar,
        c.pilarName,
        c.tema,
        c.link,
        note,
        adminUserId,
        adminUserId,
      ],
    );
  }

  const leads: { nama: string; status: string; nilai: number; kat: string; prio: string; hp: string }[] = [
    { nama: "Bakso President", status: "baru", nilai: 25_000_000, kat: "Kolaborasi Konten", prio: "Tinggi", hp: "081311110001" },
    { nama: "Hotel Tugu", status: "dihubungi", nilai: 80_000_000, kat: "Event", prio: "Tinggi", hp: "081311110002" },
    { nama: "Cokelat Klasik", status: "nego", nilai: 15_000_000, kat: "Sponsored Post", prio: "Sedang", hp: "081311110003" },
    { nama: "Orooro Cafe", status: "deal", nilai: 45_000_000, kat: "Iklan", prio: "Sedang", hp: "081311110004" },
    { nama: "Kampung Warna", status: "jalan", nilai: 60_000_000, kat: "Event", prio: "Tinggi", hp: "081311110005" },
  ];
  for (const s of leads) {
    const exists = await sql<{ n: number }>`
      select count(*)::int as n from lead where nama = ${s.nama} and company_id = ${"amazing-malang"}
    `;
    if ((exists[0]?.n ?? 0) > 0) continue;
    const id = nid();
    const dealish = ["deal", "jalan", "selesai"].includes(s.status);
    await sql.query(
      `insert into lead (id, company_id, nama, pic_nama, pic_jabatan, hp, sumber, kategori, prioritas, brief, nilai, status, assigned_to, created_by, last_updated_by, deal_at)
       values ($1,'amazing-malang',$2,'Bu Rina','Marketing',$3,'Referral',$4,$5,$6,$7,$8,$9,$9,$9,$10)`,
      [id, s.nama, s.hp, s.kat, s.prio, note, s.nilai, s.status, adminUserId, dealish ? t : null],
    );
    if (dealish) {
      await sql.query(
        `insert into lead_hasil_kerjasama (id, lead_id, jenis_kerjasama, nilai_final, periode, deliverables, updated_by)
         values ($1,$2,'Berbayar',$3,'Sep 2026','3 reels + 1 story sequence',$4)
         on conflict (lead_id) do nothing`,
        [nid(), id, s.nilai, adminUserId],
      );
    }
  }

  return { ok: true as const };
}

/** Hapus konten/lead latihan + user non-admin. Sisakan Admin dan 4 brand. */
export async function wipeLiteKeepAdmin(adminUserId: string) {
  const sql = await getSql();
  await sql.query(`delete from content_activity`);
  await sql.query(`delete from content`);
  await sql.query(`delete from lead_activity`);
  await sql.query(`delete from lead_hasil_kerjasama`);
  await sql.query(`delete from lead`);
  await sql.query(`delete from sales_breakdown`);
  await sql.query(`delete from access_token`);
  await sql.query(`delete from session where "userId" <> $1`, [adminUserId]);
  await sql.query(`delete from account where "userId" <> $1`, [adminUserId]);
  await sql.query(`delete from profiles where user_id <> $1`, [adminUserId]);
  await sql.query(`delete from "user" where id <> $1`, [adminUserId]);
  await dropSaltAndSour(sql);
  return { ok: true as const };
}

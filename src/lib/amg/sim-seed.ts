import { hashPassword } from "better-auth/crypto";
import { getSql } from "@/lib/db";
import { currentYearMonth, nid, todayISO } from "./constants";
import { SIM_ACCOUNTS, SIM_PASSWORD } from "./sim-cast";

type Sql = Awaited<ReturnType<typeof getSql>>;

async function ensureAuthUser(sql: Sql, email: string, name: string, passwordHash: string): Promise<string> {
  const found = await sql<{ id: string }>`select id from "user" where email = ${email} limit 1`;
  if (found[0]) return found[0].id;
  const id = nid();
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

export async function seedSimWorld() {
  const sql = await getSql();
  const passwordHash = await hashPassword(SIM_PASSWORD);
  const ids: Record<string, string> = {};

  for (const acc of SIM_ACCOUNTS) {
    const userId = await ensureAuthUser(sql, acc.email, acc.name, passwordHash);
    ids[acc.email] = userId;
    const isPlatform = acc.kind === "admin" || acc.kind === "gm";
    await sql`
      insert into profiles (user_id, name, email, role, company_id, is_editor, is_kreator, is_sales, is_active, updated_at)
      values (
        ${userId},
        ${acc.name},
        ${acc.email},
        ${isPlatform ? acc.kind : null},
        ${isPlatform ? null : acc.companyId},
        ${acc.kind === "editor"},
        ${acc.kind === "kreator"},
        ${acc.kind === "sales"},
        ${true},
        now()
      )
      on conflict (user_id) do update set
        name = excluded.name,
        email = excluded.email,
        role = excluded.role,
        company_id = excluded.company_id,
        is_editor = excluded.is_editor,
        is_kreator = excluded.is_kreator,
        is_sales = excluded.is_sales,
        is_active = true,
        updated_at = now()
    `;
  }

  const ym = currentYearMonth();
  const t = todayISO();
  const adminId = ids["admin@amg.test"];

  const companies = ["amazing-malang", "ame", "mata-malang", "sam-ongis"] as const;
  const targets: Record<(typeof companies)[number], number> = {
    "amazing-malang": 500_000_000,
    ame: 350_000_000,
    "mata-malang": 300_000_000,
    "sam-ongis": 200_000_000,
  };
  for (const c of companies) {
    await sql`
      insert into sales_target (id, company_id, year_month, target_value, updated_by)
      values (${`sim-t-${c}-${ym}`}, ${c}, ${ym}, ${targets[c]}, ${adminId})
      on conflict (company_id, year_month) do update set target_value = excluded.target_value, updated_by = excluded.updated_by
    `;
  }

  const salesAlloc: Array<[string, string, number]> = [
    ["amazing-malang", "sales.am@amg.test", 180_000_000],
    ["ame", "sales.ame@amg.test", 120_000_000],
    ["mata-malang", "sales.mm@amg.test", 90_000_000],
    ["sam-ongis", "sales.so@amg.test", 40_000_000],
  ];
  for (const [companyId, email, value] of salesAlloc) {
    const salesId = ids[email];
    await sql`
      insert into sales_breakdown (id, company_id, year_month, sales_user_id, allocated_value, updated_by)
      values (${`sim-b-${companyId}`}, ${companyId}, ${ym}, ${salesId}, ${value}, ${ids["gm@amg.test"]})
      on conflict (company_id, year_month, sales_user_id) do update set allocated_value = excluded.allocated_value
    `;
  }

  const kpiPlatforms: Record<(typeof companies)[number], string[]> = {
    "amazing-malang": ["instagram", "tiktok", "facebook", "threads", "youtube"],
    ame: ["instagram", "tiktok", "facebook", "threads"],
    "mata-malang": ["instagram", "tiktok", "facebook", "threads"],
    "sam-ongis": ["instagram", "tiktok", "facebook", "threads"],
  };
  const kpiJson = JSON.stringify(["Views", "Likes", "Comments", "Shares", "Reach"]);
  for (const c of companies) {
    for (const platform of kpiPlatforms[c]) {
      await sql`
        insert into kpi_settings (id, company_id, platform, enabled_metrics, updated_at)
        values (${`sim-kpi-${c}-${platform}`}, ${c}, ${platform}, ${kpiJson}, now())
        on conflict (id) do update set enabled_metrics = excluded.enabled_metrics
      `;
    }
  }

  type ContentSeed = {
    id: string;
    companyId: string;
    editorEmail: string;
    kreatorEmail: string;
    pillarId: string;
    pilarName: string;
    tema: string;
    platform: string;
    format: string;
    status: string;
    link?: string;
    catatan: string;
  };

  const contents: ContentSeed[] = [
    {
      id: "sim-c-am-eka-1",
      companyId: "amazing-malang",
      editorEmail: "editor.am@amg.test",
      kreatorEmail: "kreator.am@amg.test",
      pillarId: "am-1",
      pilarName: "Cerita Kota",
      tema: "Macet Bundaran Tugu, sudut yang jarang diambil",
      platform: "instagram",
      format: "Reel",
      status: "rencana",
      catatan: "Ambil dari jembatan, golden hour. Belum dikerjakan — latihan unggah dari sini.",
    },
    {
      id: "sim-c-am-eka-2",
      companyId: "amazing-malang",
      editorEmail: "editor.am@amg.test",
      kreatorEmail: "kreator.am@amg.test",
      pillarId: "am-4",
      pilarName: "Tempat",
      tema: "Kopi Kayutangan sebelum maghrib",
      platform: "tiktok",
      format: "Video Short",
      status: "draft",
      catatan: "Sudah ada rough cut. Kalau sudah tayang, ubah ke Publish lalu tempel tautan.",
    },
    {
      id: "sim-c-am-eka-3",
      companyId: "amazing-malang",
      editorEmail: "editor.am@amg.test",
      kreatorEmail: "kreator.am@amg.test",
      pillarId: "am-3",
      pilarName: "Tokoh",
      tema: "Mbak penjual rujak di Ijen, 30 detik",
      platform: "instagram",
      format: "Reel",
      status: "publish",
      link: "https://www.instagram.com/reel/sim-am-rujak/",
      catatan: "Contoh yang sudah selesai. Link hasil sudah diisi — ini yang benar setelah unggah.",
    },
    {
      id: "sim-c-am-eka-4",
      companyId: "amazing-malang",
      editorEmail: "editor.am@amg.test",
      kreatorEmail: "kreator.am@amg.test",
      pillarId: "am-2",
      pilarName: "Identitas Malang",
      tema: "Hujan di Jembatan Merah, take yang gagal",
      platform: "tiktok",
      format: "Video Short",
      status: "batal",
      catatan: "Dibatalkan karena cuaca. Bukan contoh unggah.",
    },
    {
      id: "sim-c-am-eka-5",
      companyId: "amazing-malang",
      editorEmail: "editor.am@amg.test",
      kreatorEmail: "kreator.am@amg.test",
      pillarId: "am-1",
      pilarName: "Cerita Kota",
      tema: "Keliling Ijen 4 menit, versi YouTube",
      platform: "youtube",
      format: "Video Long",
      status: "rencana",
      catatan: "Khusus Amazing Malang. YouTube tidak ada di brand lain.",
    },
    {
      id: "sim-c-am-raka-1",
      companyId: "amazing-malang",
      editorEmail: "editor2.am@amg.test",
      kreatorEmail: "kreator.am@amg.test",
      pillarId: "am-2",
      pilarName: "Identitas Malang",
      tema: "Arema dan mural Jodipan dari sisi seberang",
      platform: "instagram",
      format: "Carousel",
      status: "rencana",
      catatan: "Punya Raka. Eka tidak boleh melihat ini.",
    },
    {
      id: "sim-c-am-raka-2",
      companyId: "amazing-malang",
      editorEmail: "editor2.am@amg.test",
      kreatorEmail: "kreator.am@amg.test",
      pillarId: "am-3",
      pilarName: "Tokoh",
      tema: "Pak pedagang koran di depan stasiun",
      platform: "facebook",
      format: "Post Feed",
      status: "publish",
      link: "https://www.facebook.com/amazingmalang/posts/sim-raka-stasiun",
      catatan: "Sudah tayang. Contoh unggah milik Raka.",
    },
    {
      id: "sim-c-am-raka-3",
      companyId: "amazing-malang",
      editorEmail: "editor2.am@amg.test",
      kreatorEmail: "kreator.am@amg.test",
      pillarId: "am-4",
      pilarName: "Tempat",
      tema: "Taman Trunojoyo sepi jam 6 pagi",
      platform: "tiktok",
      format: "Video Short",
      status: "draft",
      catatan: "Draft Raka. Kiki melihat ini karena di-assign ke dia.",
    },

    {
      id: "sim-c-ame-1",
      companyId: "ame",
      editorEmail: "editor.ame@amg.test",
      kreatorEmail: "kreator.ame@amg.test",
      pillarId: "ame-1",
      pilarName: "Cita Rasa",
      tema: "Bakso President jam 2 pagi",
      platform: "instagram",
      format: "Reel",
      status: "draft",
      catatan: "Ambil uap mangkok, tanpa logo merek di frame lama.",
    },
    {
      id: "sim-c-ame-2",
      companyId: "ame",
      editorEmail: "editor.ame@amg.test",
      kreatorEmail: "kreator.ame@amg.test",
      pillarId: "ame-2",
      pilarName: "Petualangan Kuliner",
      tema: "Cokelat Klasik, satu sendok yang bikin ramai",
      platform: "tiktok",
      format: "Video Short",
      status: "rencana",
      catatan: "Latihan unggah AME: kerjakan dulu, baru tempel tautan.",
    },
    {
      id: "sim-c-ame-3",
      companyId: "ame",
      editorEmail: "editor.ame@amg.test",
      kreatorEmail: "kreator.ame@amg.test",
      pillarId: "ame-3",
      pilarName: "Resep & Tips",
      tema: "Nasi goreng kaki lima yang selalu antri",
      platform: "instagram",
      format: "Carousel",
      status: "publish",
      link: "https://www.instagram.com/p/sim-ame-nasgor/",
      catatan: "Contoh AME yang sudah diunggah.",
    },
    {
      id: "sim-c-ame-4",
      companyId: "ame",
      editorEmail: "editor.ame@amg.test",
      kreatorEmail: "kreator.ame@amg.test",
      pillarId: "ame-1",
      pilarName: "Cita Rasa",
      tema: "Review warung yang tutup mendadak",
      platform: "tiktok",
      format: "Video Short",
      status: "batal",
      catatan: "Batal karena lokasi tutup.",
    },

    {
      id: "sim-c-mm-1",
      companyId: "mata-malang",
      editorEmail: "editor.mm@amg.test",
      kreatorEmail: "kreator.mm@amg.test",
      pillarId: "mm-1",
      pilarName: "Sudut Pandang Warga",
      tema: "Pagi di Ijen sebelum macet",
      platform: "instagram",
      format: "Story",
      status: "rencana",
      catatan: "Story 15 detik, suara lingkungan.",
    },
    {
      id: "sim-c-mm-2",
      companyId: "mata-malang",
      editorEmail: "editor.mm@amg.test",
      kreatorEmail: "kreator.mm@amg.test",
      pillarId: "mm-3",
      pilarName: "Ruang Publik",
      tema: "Alun-alun basah habis hujan",
      platform: "tiktok",
      format: "Video Short",
      status: "draft",
      catatan: "Rough cut ada. Siap unggah setelah color.",
    },
    {
      id: "sim-c-mm-3",
      companyId: "mata-malang",
      editorEmail: "editor.mm@amg.test",
      kreatorEmail: "kreator.mm@amg.test",
      pillarId: "mm-2",
      pilarName: "Momen Harian",
      tema: "Antrian transat jam pulang kantor",
      platform: "instagram",
      format: "Reel",
      status: "publish",
      link: "https://www.instagram.com/reel/sim-mm-transat/",
      catatan: "Contoh Mata Malang yang sudah tayang.",
    },

    {
      id: "sim-c-so-1",
      companyId: "sam-ongis",
      editorEmail: "editor.so@amg.test",
      kreatorEmail: "kreator.so@amg.test",
      pillarId: "so-1",
      pilarName: "Komedi Harian",
      tema: "Antrian SPBU yang pura-pura sabar",
      platform: "instagram",
      format: "Reel",
      status: "rencana",
      catatan: "Punchline di detik ke-12.",
    },
    {
      id: "sim-c-so-2",
      companyId: "sam-ongis",
      editorEmail: "editor.so@amg.test",
      kreatorEmail: "kreator.so@amg.test",
      pillarId: "so-2",
      pilarName: "Observasi Sosial",
      tema: "Warung kopi yang WiFi-nya ritual",
      platform: "tiktok",
      format: "Video Short",
      status: "draft",
      catatan: "Ambil reaction pelanggan, bukan interior saja.",
    },
    {
      id: "sim-c-so-3",
      companyId: "sam-ongis",
      editorEmail: "editor.so@amg.test",
      kreatorEmail: "kreator.so@amg.test",
      pillarId: "so-3",
      pilarName: "Curhat Receh",
      tema: "Chat group RT yang selalu salah kirim stiker",
      platform: "instagram",
      format: "Reel",
      status: "publish",
      link: "https://www.instagram.com/reel/sim-so-stiker/",
      catatan: "Contoh Sam Ongis yang sudah diunggah.",
    },
  ];

  for (const c of contents) {
    const editorId = ids[c.editorEmail];
    const kreatorId = ids[c.kreatorEmail];
    await sql`
      insert into content (
        id, company_id, tanggal_tayang, status, platform, format, pillar_setting_id, pilar_name,
        tema, catatan, link_hasil, created_by, assigned_to, last_updated_by
      ) values (
        ${c.id}, ${c.companyId}, ${t}::date, ${c.status}, ${c.platform}, ${c.format}, ${c.pillarId}, ${c.pilarName},
        ${c.tema}, ${c.catatan}, ${c.link ?? null}, ${editorId}, ${kreatorId}, ${editorId}
      )
      on conflict (id) do update set
        tema = excluded.tema,
        catatan = excluded.catatan,
        link_hasil = excluded.link_hasil,
        status = excluded.status,
        platform = excluded.platform,
        format = excluded.format,
        pillar_setting_id = excluded.pillar_setting_id,
        pilar_name = excluded.pilar_name,
        assigned_to = excluded.assigned_to
    `;
    await sql`
      insert into content_activity (id, content_id, user_id, action, new_value, notes)
      values (${`${c.id}-act-create`}, ${c.id}, ${editorId}, ${"create"}, ${c.tema}, ${"Rencana simulasi"})
      on conflict (id) do nothing
    `;
    if (c.status === "draft" || c.status === "publish" || c.status === "batal") {
      await sql`
        insert into content_activity (id, content_id, user_id, action, old_value, new_value)
        values (${`${c.id}-act-status`}, ${c.id}, ${kreatorId}, ${"status_update"}, ${"rencana"}, ${c.status})
        on conflict (id) do nothing
      `;
    }
    if (c.status === "publish" && c.link) {
      await sql`
        insert into content_activity (id, content_id, user_id, action, new_value, notes)
        values (${`${c.id}-act-link`}, ${c.id}, ${kreatorId}, ${"status_update"}, ${"publish"}, ${`Link hasil: ${c.link}`})
        on conflict (id) do nothing
      `;
    }
  }

  type LeadSeed = {
    id: string;
    companyId: string;
    salesEmail: string;
    nama: string;
    status: string;
    nilai: number;
    kat: string;
    prio: string;
    hp: string;
    pic: string;
    sumber: string;
  };

  const leads: LeadSeed[] = [
    { id: "sim-l-am-1", companyId: "amazing-malang", salesEmail: "sales.am@amg.test", nama: "Bakso President", status: "baru", nilai: 25_000_000, kat: "Kolaborasi Konten", prio: "Tinggi", hp: "081311110001", pic: "Bu Rina", sumber: "Referral" },
    { id: "sim-l-am-2", companyId: "amazing-malang", salesEmail: "sales.am@amg.test", nama: "Hotel Tugu", status: "dihubungi", nilai: 80_000_000, kat: "Event", prio: "Tinggi", hp: "081311110002", pic: "Pak Dimas", sumber: "Website" },
    { id: "sim-l-am-3", companyId: "amazing-malang", salesEmail: "sales.am@amg.test", nama: "Cokelat Klasik", status: "nego", nilai: 15_000_000, kat: "Sponsored Post", prio: "Sedang", hp: "081311110003", pic: "Mbak Sinta", sumber: "DM Instagram" },
    { id: "sim-l-am-4", companyId: "amazing-malang", salesEmail: "sales.am@amg.test", nama: "Orooro Cafe", status: "deal", nilai: 45_000_000, kat: "Iklan", prio: "Sedang", hp: "081311110004", pic: "Pak Andi", sumber: "Event" },
    { id: "sim-l-am-5", companyId: "amazing-malang", salesEmail: "sales.am@amg.test", nama: "Kampung Warna", status: "jalan", nilai: 60_000_000, kat: "Event", prio: "Tinggi", hp: "081311110005", pic: "Bu Lestari", sumber: "Referral" },
    { id: "sim-l-am-6", companyId: "amazing-malang", salesEmail: "sales.am@amg.test", nama: "Toko Oen", status: "selesai", nilai: 75_000_000, kat: "Kolaborasi Konten", prio: "Rendah", hp: "081311110006", pic: "Pak Hartono", sumber: "Website" },

    { id: "sim-l-ame-1", companyId: "ame", salesEmail: "sales.ame@amg.test", nama: "Warung Bu Kris", status: "baru", nilai: 12_000_000, kat: "Kolaborasi Konten", prio: "Sedang", hp: "081322220001", pic: "Bu Kris", sumber: "Referral" },
    { id: "sim-l-ame-2", companyId: "ame", salesEmail: "sales.ame@amg.test", nama: "Mie Ramen Ijen", status: "dihubungi", nilai: 18_000_000, kat: "Sponsored Post", prio: "Tinggi", hp: "081322220002", pic: "Chef Yudi", sumber: "DM Instagram" },
    { id: "sim-l-ame-3", companyId: "ame", salesEmail: "sales.ame@amg.test", nama: "Sate Pak Sholeh", status: "nego", nilai: 22_000_000, kat: "Event", prio: "Sedang", hp: "081322220003", pic: "Pak Sholeh", sumber: "Event" },
    { id: "sim-l-ame-4", companyId: "ame", salesEmail: "sales.ame@amg.test", nama: "Kopi Tuku Malang", status: "deal", nilai: 40_000_000, kat: "Iklan", prio: "Tinggi", hp: "081322220004", pic: "Mbak Diah", sumber: "Website" },
    { id: "sim-l-ame-5", companyId: "ame", salesEmail: "sales.ame@amg.test", nama: "Depot Cak Man", status: "jalan", nilai: 35_000_000, kat: "Kolaborasi Konten", prio: "Sedang", hp: "081322220005", pic: "Cak Man", sumber: "Referral" },
    { id: "sim-l-ame-6", companyId: "ame", salesEmail: "sales.ame@amg.test", nama: "Pujasera Oro-oro", status: "selesai", nilai: 45_000_000, kat: "Event", prio: "Rendah", hp: "081322220006", pic: "Bu Anik", sumber: "Lainnya" },

    { id: "sim-l-mm-1", companyId: "mata-malang", salesEmail: "sales.mm@amg.test", nama: "Komunitas Ijen", status: "baru", nilai: 8_000_000, kat: "Kolaborasi Konten", prio: "Sedang", hp: "081333330001", pic: "Mas Reza", sumber: "Event" },
    { id: "sim-l-mm-2", companyId: "mata-malang", salesEmail: "sales.mm@amg.test", nama: "PKL Alun-alun", status: "dihubungi", nilai: 10_000_000, kat: "Event", prio: "Rendah", hp: "081333330002", pic: "Pak RT", sumber: "Referral" },
    { id: "sim-l-mm-3", companyId: "mata-malang", salesEmail: "sales.mm@amg.test", nama: "Radio Nada FM", status: "nego", nilai: 20_000_000, kat: "Iklan", prio: "Tinggi", hp: "081333330003", pic: "Mbak Nia", sumber: "Website" },
    { id: "sim-l-mm-4", companyId: "mata-malang", salesEmail: "sales.mm@amg.test", nama: "Festival Bunga", status: "deal", nilai: 30_000_000, kat: "Event", prio: "Tinggi", hp: "081333330004", pic: "Bu Wati", sumber: "Event" },
    { id: "sim-l-mm-5", companyId: "mata-malang", salesEmail: "sales.mm@amg.test", nama: "Perpus Umum", status: "jalan", nilai: 28_000_000, kat: "Kolaborasi Konten", prio: "Sedang", hp: "081333330005", pic: "Pak Pustakawan", sumber: "Lainnya" },
    { id: "sim-l-mm-6", companyId: "mata-malang", salesEmail: "sales.mm@amg.test", nama: "Pos Ronda Merjosari", status: "selesai", nilai: 32_000_000, kat: "Sponsored Post", prio: "Rendah", hp: "081333330006", pic: "Pak Hansip", sumber: "Referral" },

    { id: "sim-l-so-1", companyId: "sam-ongis", salesEmail: "sales.so@amg.test", nama: "Warung Kopi Cak Udin", status: "baru", nilai: 6_000_000, kat: "Kolaborasi Konten", prio: "Sedang", hp: "081344440001", pic: "Cak Udin", sumber: "Referral" },
    { id: "sim-l-so-2", companyId: "sam-ongis", salesEmail: "sales.so@amg.test", nama: "Barbershop Jombang", status: "dihubungi", nilai: 7_000_000, kat: "Sponsored Post", prio: "Rendah", hp: "081344440002", pic: "Mas Guntur", sumber: "DM Instagram" },
    { id: "sim-l-so-3", companyId: "sam-ongis", salesEmail: "sales.so@amg.test", nama: "Angkringan Rel", status: "nego", nilai: 9_000_000, kat: "Event", prio: "Sedang", hp: "081344440003", pic: "Pak Joko", sumber: "Event" },
    { id: "sim-l-so-4", companyId: "sam-ongis", salesEmail: "sales.so@amg.test", nama: "Toko Obat Pojok", status: "deal", nilai: 12_000_000, kat: "Iklan", prio: "Tinggi", hp: "081344440004", pic: "Bu Apoteker", sumber: "Website" },
    { id: "sim-l-so-5", companyId: "sam-ongis", salesEmail: "sales.so@amg.test", nama: "Bengkel Pak Eko", status: "jalan", nilai: 14_000_000, kat: "Kolaborasi Konten", prio: "Sedang", hp: "081344440005", pic: "Pak Eko", sumber: "Lainnya" },
    { id: "sim-l-so-6", companyId: "sam-ongis", salesEmail: "sales.so@amg.test", nama: "Kos Putri Lowokwaru", status: "selesai", nilai: 14_000_000, kat: "Event", prio: "Rendah", hp: "081344440006", pic: "Bu Kos", sumber: "Referral" },
  ];

  const followup: Record<string, { jenis: string; catatan: string }> = {
    baru: { jenis: "sistem", catatan: "Lead masuk dari simulasi. Belum dihubungi." },
    dihubungi: { jenis: "wa", catatan: "Sudah WA PIC. Menunggu balasan soal jadwal." },
    nego: { jenis: "meeting", catatan: "Nego paket 3 reel + 1 booth. Masih tawar nilai." },
    deal: { jenis: "wa", catatan: "Deal disetujui. Brief akan dikirim Editor." },
    jalan: { jenis: "telepon", catatan: "Produksi minggu ini. Kreator sudah dijadwalkan." },
    selesai: { jenis: "email", catatan: "Invoice lunas. Arsipkan hasil kerja sama." },
  };

  for (const l of leads) {
    const salesId = ids[l.salesEmail];
    const dealish = ["deal", "jalan", "selesai"].includes(l.status);
    await sql`
      insert into lead (
        id, company_id, nama, pic_nama, pic_jabatan, hp, sumber, kategori, prioritas, brief, nilai, status,
        assigned_to, created_by, last_updated_by, deal_at
      ) values (
        ${l.id}, ${l.companyId}, ${l.nama}, ${l.pic}, ${"Marketing"}, ${l.hp},
        ${l.sumber}, ${l.kat}, ${l.prio}, ${"Brief simulasi: 3 reels + 1 booth. Kirim moodboard sebelum shooting."}, ${l.nilai}, ${l.status},
        ${salesId}, ${salesId}, ${salesId}, ${dealish ? t : null}
      )
      on conflict (id) do nothing
    `;
    await sql`
      insert into lead_activity (id, lead_id, user_id, jenis, catatan, tanggal)
      values (${`${l.id}-act-1`}, ${l.id}, ${salesId}, ${"sistem"}, ${"Lead simulasi dibuat."}, ${t}::date)
      on conflict (id) do nothing
    `;
    const fu = followup[l.status];
    if (fu && l.status !== "baru") {
      await sql`
        insert into lead_activity (id, lead_id, user_id, jenis, catatan, tanggal)
        values (${`${l.id}-act-2`}, ${l.id}, ${salesId}, ${fu.jenis}, ${fu.catatan}, ${t}::date)
        on conflict (id) do nothing
      `;
    }
    if (dealish) {
      await sql`
        insert into lead_hasil_kerjasama (id, lead_id, jenis_kerjasama, nilai_final, periode, deliverables, updated_by)
        values (${`${l.id}-hasil`}, ${l.id}, ${"Berbayar"}, ${l.nilai}, ${"Sep 2026"}, ${"3 reels + 1 story sequence"}, ${salesId})
        on conflict (lead_id) do nothing
      `;
    }
  }

  return { ok: true as const, reused: false, count: SIM_ACCOUNTS.length };
}

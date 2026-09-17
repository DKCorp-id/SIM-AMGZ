-- AMG Internal Operations schema (Phase 1)
-- user_id is TEXT to match Better Auth ids

create table if not exists companies (
  id text primary key,
  name text not null,
  slug text not null unique,
  platforms text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id text primary key,
  name text not null,
  email text,
  role text,
  company_id text references companies(id),
  is_editor boolean not null default false,
  is_kreator boolean not null default false,
  is_sales boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pillar_setting (
  id text primary key,
  company_id text not null references companies(id),
  pilar_name text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  unique (company_id, pilar_name)
);

create table if not exists content (
  id text primary key,
  company_id text not null references companies(id),
  tanggal_tayang date not null,
  status text not null,
  platform text not null,
  format text not null,
  pillar_setting_id text references pillar_setting(id) on delete set null,
  pilar_name text not null,
  tema text not null,
  link_hasil text,
  catatan text,
  created_by text not null,
  assigned_to text,
  created_at timestamptz not null default now(),
  last_updated_by text,
  last_updated_at timestamptz not null default now()
);

create index if not exists content_created_by_idx on content (created_by);
create index if not exists content_assigned_idx on content (assigned_to, status);
create index if not exists content_company_date_idx on content (company_id, tanggal_tayang);

create table if not exists content_activity (
  id text primary key,
  content_id text not null references content(id) on delete cascade,
  user_id text not null,
  action text not null,
  old_value text,
  new_value text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists lead (
  id text primary key,
  company_id text not null references companies(id),
  nama text not null,
  pic_nama text not null,
  pic_jabatan text,
  hp text not null,
  email text,
  sumber text not null,
  kategori text not null,
  prioritas text not null,
  brief text,
  nilai bigint not null default 0,
  status text not null,
  assigned_to text not null,
  created_by text,
  deal_at timestamptz,
  created_at timestamptz not null default now(),
  last_updated_by text,
  last_updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists lead_assigned_idx on lead (assigned_to, status, deleted_at);
create index if not exists lead_company_idx on lead (company_id, status, deleted_at);
create index if not exists lead_deal_idx on lead (assigned_to, status, deleted_at, deal_at);

create table if not exists lead_activity (
  id text primary key,
  lead_id text not null references lead(id),
  user_id text not null,
  jenis text not null,
  catatan text not null,
  tindak_lanjut text,
  tindak_lanjut_tanggal date,
  tanggal date not null,
  created_at timestamptz not null default now()
);

create table if not exists lead_hasil_kerjasama (
  id text primary key,
  lead_id text not null unique references lead(id),
  jenis_kerjasama text not null,
  nilai_final bigint not null default 0,
  periode text,
  deliverables text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);

create table if not exists kpi_settings (
  id text primary key,
  company_id text not null references companies(id),
  platform text not null,
  enabled_metrics text not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, platform)
);

create table if not exists sales_target (
  id text primary key,
  company_id text not null references companies(id),
  year_month text not null,
  target_value bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,
  unique (company_id, year_month)
);

create table if not exists sales_breakdown (
  id text primary key,
  company_id text not null references companies(id),
  year_month text not null,
  sales_user_id text not null,
  allocated_value bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,
  unique (company_id, year_month, sales_user_id)
);

create table if not exists ranking_threshold (
  company_id text primary key references companies(id),
  green_min bigint not null default 100000000,
  orange_min bigint not null default 50000000
);

insert into companies (id, name, slug, platforms) values
  ('amazing-malang', 'Amazing Malang', 'amazing-malang', '["instagram","tiktok","facebook","threads","youtube"]'),
  ('ame', 'Amazing Malang Eats', 'ame', '["instagram","tiktok","facebook","threads"]'),
  ('mata-malang', 'Mata Malang', 'mata-malang', '["instagram","tiktok","facebook","threads"]'),
  ('sam-ongis', 'Sam Ongis', 'sam-ongis', '["instagram","tiktok","facebook","threads"]')
on conflict (id) do nothing;

insert into pillar_setting (id, company_id, pilar_name, sort_order) values
  ('am-1', 'amazing-malang', 'Cerita Kota', 1),
  ('am-2', 'amazing-malang', 'Identitas Malang', 2),
  ('am-3', 'amazing-malang', 'Tokoh', 3),
  ('am-4', 'amazing-malang', 'Tempat', 4),
  ('ame-1', 'ame', 'Cita Rasa', 1),
  ('ame-2', 'ame', 'Petualangan Kuliner', 2),
  ('ame-3', 'ame', 'Resep & Tips', 3),
  ('mm-1', 'mata-malang', 'Sudut Pandang Warga', 1),
  ('mm-2', 'mata-malang', 'Momen Harian', 2),
  ('mm-3', 'mata-malang', 'Ruang Publik', 3),
  ('so-1', 'sam-ongis', 'Komedi Harian', 1),
  ('so-2', 'sam-ongis', 'Observasi Sosial', 2),
  ('so-3', 'sam-ongis', 'Curhat Receh', 3)
on conflict (id) do nothing;

insert into ranking_threshold (company_id, green_min, orange_min) values
  ('amazing-malang', 100000000, 50000000),
  ('ame', 100000000, 50000000),
  ('mata-malang', 100000000, 50000000),
  ('sam-ongis', 100000000, 50000000)
on conflict (company_id) do nothing;

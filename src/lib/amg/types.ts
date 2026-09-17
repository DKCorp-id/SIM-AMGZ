export type AppRole = "admin" | "gm" | null;

export type Profile = {
  userId: string;
  name: string;
  email: string | null;
  role: "admin" | "gm" | null;
  companyId: string | null;
  isEditor: boolean;
  isKreator: boolean;
  isSales: boolean;
  isActive: boolean;
  companyName?: string | null;
};

export type Company = {
  id: string;
  name: string;
  slug: string;
  platforms: string[];
};

export type Actor = Profile & {
  isAdmin: boolean;
  isGm: boolean;
  isPlatform: boolean;
};

export type ContentRow = {
  id: string;
  companyId: string;
  companyName: string;
  tanggalTayang: string;
  status: string;
  platform: string;
  format: string;
  pillarSettingId: string | null;
  pilarName: string;
  tema: string;
  linkHasil: string | null;
  catatan: string | null;
  createdBy: string;
  createdByName: string;
  assignedTo: string | null;
  assignedName: string | null;
  createdAt: string;
};

export type LeadRow = {
  id: string;
  companyId: string;
  companyName: string;
  nama: string;
  picNama: string;
  picJabatan: string | null;
  hp: string;
  email: string | null;
  sumber: string;
  kategori: string;
  prioritas: string;
  brief: string | null;
  nilai: number;
  status: string;
  assignedTo: string;
  assignedName: string;
  dealAt: string | null;
  deletedAt: string | null;
  nilaiFinal: number | null;
  jenisKerjasama: string | null;
  periode: string | null;
  deliverables: string | null;
};

export type LeadActivity = {
  id: string;
  jenis: string;
  catatan: string;
  tindakLanjut: string | null;
  tindakLanjutTanggal: string | null;
  tanggal: string;
  userName: string;
  createdAt: string;
};

export function asActor(p: Profile): Actor {
  return {
    ...p,
    isAdmin: p.role === "admin",
    isGm: p.role === "gm",
    isPlatform: p.role === "admin" || p.role === "gm",
  };
}

export function landingPath(p: Profile) {
  if (p.isEditor) return "/konten";
  if (p.isKreator) return "/tugas";
  if (p.isSales) return "/crm";
  if (p.role === "gm") return "/breakdown";
  if (p.role === "admin") return "/settings";
  return "/ranking";
}

export function canSeeNav(p: Profile, item: string) {
  switch (item) {
    case "konten":
      return p.isEditor || p.role === "admin" || p.role === "gm";
    case "tugas":
      return p.isKreator;
    case "crm":
      return p.isSales || p.role === "admin" || p.role === "gm";
    case "breakdown":
      return p.role === "admin" || p.role === "gm";
    case "settings":
      return p.role === "admin";
    case "users":
      return p.role === "admin" || p.role === "gm";
    case "ranking":
      return p.isSales || p.role === "admin" || p.role === "gm";
    case "panduan":
      return true;
    default:
      return false;
  }
}

export type SimKind = "admin" | "gm" | "editor" | "kreator" | "sales";

export type SimAccount = {
  email: string;
  name: string;
  kind: SimKind;
  companyId: string | null;
  companyLabel: string;
  hint?: string;
};

export const SIM_PASSWORD = "malangops1";

export const SIM_ACCOUNTS: SimAccount[] = [
  { email: "admin@amg.test", name: "Andi Admin", kind: "admin", companyId: null, companyLabel: "Lintas brand" },
  { email: "gm@amg.test", name: "Gita GM", kind: "gm", companyId: null, companyLabel: "Lintas brand" },

  { email: "editor.am@amg.test", name: "Eka Editor", kind: "editor", companyId: "amazing-malang", companyLabel: "Amazing Malang", hint: "Lihat rencana konten" },
  { email: "editor2.am@amg.test", name: "Raka Editor", kind: "editor", companyId: "amazing-malang", companyLabel: "Amazing Malang", hint: "Isolasi: tidak melihat konten Eka" },
  { email: "kreator.am@amg.test", name: "Kiki Kreator", kind: "kreator", companyId: "amazing-malang", companyLabel: "Amazing Malang", hint: "Latihan unggah hasil — mulai di sini" },
  { email: "sales.am@amg.test", name: "Sari Sales", kind: "sales", companyId: "amazing-malang", companyLabel: "Amazing Malang", hint: "Papan CRM 6 tahap sudah terisi" },

  { email: "editor.ame@amg.test", name: "Nia Editor", kind: "editor", companyId: "ame", companyLabel: "Amazing Malang Eats" },
  { email: "kreator.ame@amg.test", name: "Bimo Kreator", kind: "kreator", companyId: "ame", companyLabel: "Amazing Malang Eats" },
  { email: "sales.ame@amg.test", name: "Dina Sales", kind: "sales", companyId: "ame", companyLabel: "Amazing Malang Eats" },

  { email: "editor.mm@amg.test", name: "Yoga Editor", kind: "editor", companyId: "mata-malang", companyLabel: "Mata Malang" },
  { email: "kreator.mm@amg.test", name: "Laras Kreator", kind: "kreator", companyId: "mata-malang", companyLabel: "Mata Malang" },
  { email: "sales.mm@amg.test", name: "Fajar Sales", kind: "sales", companyId: "mata-malang", companyLabel: "Mata Malang" },

  { email: "editor.so@amg.test", name: "Wulan Editor", kind: "editor", companyId: "sam-ongis", companyLabel: "Sam Ongis" },
  { email: "kreator.so@amg.test", name: "Joko Kreator", kind: "kreator", companyId: "sam-ongis", companyLabel: "Sam Ongis" },
  { email: "sales.so@amg.test", name: "Tari Sales", kind: "sales", companyId: "sam-ongis", companyLabel: "Sam Ongis" },
];

export const SIM_KIND_LABEL: Record<SimKind, string> = {
  admin: "Admin",
  gm: "GM",
  editor: "Editor",
  kreator: "Kreator",
  sales: "Sales",
};

export const SIM_GROUPS: Array<{ label: string; companyId: string | null }> = [
  { label: "Lintas brand", companyId: null },
  { label: "Amazing Malang", companyId: "amazing-malang" },
  { label: "Amazing Malang Eats", companyId: "ame" },
  { label: "Mata Malang", companyId: "mata-malang" },
  { label: "Sam Ongis", companyId: "sam-ongis" },
];

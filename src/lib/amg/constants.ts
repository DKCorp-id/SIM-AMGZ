export const FORMATS: Record<string, string[]> = {
  instagram: ["Reel", "Post Feed", "Carousel", "Story", "Live"],
  tiktok: ["Video Short", "Slideshow", "Live"],
  facebook: ["Post Feed", "Reel", "Story", "Video"],
  threads: ["Text Post", "Post + Image"],
  youtube: ["Video Long", "Shorts", "Community Post"],
};

export const METRICS: Record<string, string[]> = {
  instagram: [
    "Views",
    "Likes",
    "Comments",
    "Saves",
    "Shares",
    "Reach",
    "Impressions",
    "Stories Count",
    "Followers Gain",
    "Engagement Rate",
  ],
  tiktok: [
    "Views",
    "Likes",
    "Comments",
    "Shares",
    "Bookmarks",
    "Reach",
    "Impressions",
    "Videos Count",
    "Followers Gain",
    "Engagement Rate",
  ],
  facebook: [
    "Views",
    "Likes",
    "Comments",
    "Shares",
    "Reach",
    "Impressions",
    "Page Followers Gain",
    "Engagement Rate",
    "Video Views",
    "Post Engagement",
  ],
  threads: [
    "Views",
    "Likes",
    "Replies",
    "Shares",
    "Reach",
    "Followers Gain",
    "Engagement Rate",
    "Reposts",
    "Quote Posts",
    "Impressions",
  ],
  youtube: ["Views", "Likes", "Comments", "Watch Time", "Subscribers Gain"],
};

export const CONTENT_STATUSES = ["rencana", "draft", "publish", "batal"] as const;
export const LEAD_STATUSES = ["baru", "dihubungi", "nego", "deal", "jalan", "selesai"] as const;
export const LEAD_SUMBER = ["Referral", "DM Instagram", "Website", "Event", "Lainnya"] as const;
export const LEAD_KATEGORI = [
  "Kolaborasi Konten",
  "Sponsored Post",
  "Event",
  "Iklan",
  "Lainnya",
] as const;
export const LEAD_PRIORITAS = ["Tinggi", "Sedang", "Rendah"] as const;
export const ACTIVITY_JENIS = ["telepon", "wa", "meeting", "email", "kirim_proposal"] as const;
export const JENIS_KERJASAMA = ["Barter", "Berbayar", "Kombinasi"] as const;

export const CONTENT_STATUS_LABEL: Record<string, string> = {
  rencana: "Rencana",
  draft: "Draft",
  publish: "Publish",
  batal: "Batal",
};

export const LEAD_STATUS_LABEL: Record<string, string> = {
  baru: "Baru",
  dihubungi: "Dihubungi",
  nego: "Nego",
  deal: "Deal",
  jalan: "Jalan",
  selesai: "Selesai",
};

export const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  threads: "Threads",
  youtube: "YouTube",
};

export function currentYearMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  return parts.slice(0, 7);
}

export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function nid() {
  return crypto.randomUUID();
}

// Fungsi bantu murni (diuji dengan Vitest di tahap CI).
export const MAX_TITLE = 200;

export const FILTERS = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Belum selesai" },
  { value: "done", label: "Selesai" },
];

export function validateTitle(raw) {
  const title = (raw ?? "").trim();
  if (!title) return { ok: false, error: "Judul tugas tidak boleh kosong" };
  if (title.length > MAX_TITLE) return { ok: false, error: `Judul maksimal ${MAX_TITLE} karakter` };
  return { ok: true, title };
}

// Membentuk query string untuk fitur filter & cari, contoh: ?status=done&q=docker
export function buildQuery({ status = "all", q = "" } = {}) {
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  const keyword = q.trim();
  if (keyword) params.set("q", keyword);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function emptyMessage({ status = "all", q = "" } = {}) {
  if (q.trim()) return `Tidak ada tugas yang cocok dengan "${q.trim()}".`;
  if (status === "active") return "Semua tugas sudah selesai. 🎉";
  if (status === "done") return "Belum ada tugas yang selesai.";
  return "Belum ada tugas. Tambahkan tugas pertama Anda.";
}

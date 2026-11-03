// Fungsi bantu murni (diuji dengan Vitest di tahap CI).
export const MAX_TITLE = 200;

export function validateTitle(raw) {
  const title = (raw ?? "").trim();
  if (!title) return { ok: false, error: "Judul tugas tidak boleh kosong" };
  if (title.length > MAX_TITLE) return { ok: false, error: `Judul maksimal ${MAX_TITLE} karakter` };
  return { ok: true, title };
}

export function summarize(todos) {
  const done = todos.filter((t) => t.done).length;
  return { total: todos.length, done, remaining: todos.length - done };
}

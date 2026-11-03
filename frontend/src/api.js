// Semua request ke backend lewat path relatif /api (diteruskan Nginx ke container backend).
async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request gagal (HTTP ${res.status})`);
  return data;
}

export const api = {
  info: () => request("GET", "/info"),
  list: () => request("GET", "/todos"),
  create: (title) => request("POST", "/todos", { title }),
  setDone: (id, done) => request("PATCH", `/todos/${id}`, { done }),
  remove: (id) => request("DELETE", `/todos/${id}`),
};

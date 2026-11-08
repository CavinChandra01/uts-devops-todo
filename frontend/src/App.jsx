import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import { emptyMessage, FILTERS, MAX_TITLE, validateTitle } from "./utils.js";

const FRONTEND_VERSION = import.meta.env.VITE_APP_VERSION || "dev";

function TodoItem({ todo, onToggle, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);

  async function save(e) {
    e.preventDefault();
    const ok = await onRename(todo, draft);
    if (ok) setEditing(false);
  }

  if (editing) {
    return (
      <li className="editing">
        <form className="edit" onSubmit={save}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
            maxLength={MAX_TITLE}
            aria-label="Ubah judul tugas"
            autoFocus
          />
          <button type="submit">Simpan</button>
          <button type="button" className="secondary" onClick={() => setEditing(false)}>
            Batal
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className={todo.done ? "done" : ""}>
      <label>
        <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo)} />
        <span>{todo.title}</span>
        {/* Muncul otomatis jika database punya kolom priority (hasil migrasi) */}
        {todo.priority && <em className="badge">{todo.priority}</em>}
      </label>
      <div className="actions">
        <button
          className="link"
          onClick={() => {
            setDraft(todo.title);
            setEditing(true);
          }}
          aria-label={`Edit ${todo.title}`}
        >
          Edit
        </button>
        <button className="link delete" onClick={() => onDelete(todo)} aria-label={`Hapus ${todo.title}`}>
          Hapus
        </button>
      </div>
    </li>
  );
}

export default function App() {
  const [todos, setTodos] = useState([]);
  const [stats, setStats] = useState({ total: 0, done: 0, remaining: 0 });
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);

  // Tunda pencarian 300 ms setelah pengguna berhenti mengetik
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // reloadKey dinaikkan setiap kali data berubah agar daftar dimuat ulang
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Muat daftar (sesuai filter & kata kunci) dan ringkasan dari backend.
  // Flag "ignore" mencegah respons lama menimpa hasil pencarian yang lebih baru.
  useEffect(() => {
    let ignore = false;
    Promise.all([api.list({ status, q: query }), api.stats()])
      .then(([list, s]) => {
        if (ignore) return;
        setTodos(list);
        setStats(s);
        setError("");
      })
      .catch((e) => !ignore && setError(e.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [status, query, reloadKey]);

  useEffect(() => {
    api.info().then(setInfo).catch(() => setInfo(null));
  }, []);

  async function run(action) {
    try {
      await action();
      reload();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    const check = validateTitle(title);
    if (!check.ok) return setError(check.error);
    if (await run(() => api.create(check.title))) setTitle("");
  }

  async function handleRename(todo, draft) {
    const check = validateTitle(draft);
    if (!check.ok) {
      setError(check.error);
      return false;
    }
    if (check.title === todo.title) return true;
    return run(() => api.rename(todo.id, check.title));
  }

  return (
    <div className="page">
      <main className="card">
        <header>
          <h1>
            Daftar Tugas Kelompok <span className="brand">TheTarik</span>
          </h1>
          <p className="subtitle">Aplikasi full stack React + Express + MySQL yang berjalan di container Docker</p>
        </header>

        <form className="add" onSubmit={handleAdd}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tulis tugas baru, lalu tekan Tambah"
            maxLength={MAX_TITLE}
            aria-label="Judul tugas"
          />
          <button type="submit">Tambah</button>
        </form>

        <div className="toolbar">
          <div className="tabs" role="tablist" aria-label="Filter status">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                role="tab"
                aria-selected={status === f.value}
                className={status === f.value ? "tab active" : "tab"}
                onClick={() => setStatus(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            className="search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tugas..."
            aria-label="Cari tugas"
          />
        </div>

        {error && <p className="error">{error}</p>}

        <p className="stats">
          {stats.total} tugas · {stats.done} selesai · {stats.remaining} tersisa
        </p>

        {loading ? (
          <p className="empty">Memuat...</p>
        ) : todos.length === 0 ? (
          <p className="empty">{emptyMessage({ status, q: query })}</p>
        ) : (
          <ul className="list">
            {todos.map((t) => (
              <TodoItem
                key={t.id}
                todo={t}
                onToggle={(todo) => run(() => api.setDone(todo.id, !todo.done))}
                onRename={handleRename}
                onDelete={(todo) => run(() => api.remove(todo.id))}
              />
            ))}
          </ul>
        )}
      </main>

      <footer>
        Frontend {FRONTEND_VERSION} · Backend {info?.version ?? "-"} ·{" "}
        {info?.database ? `MySQL ${info.database}` : "Database tidak terhubung"}
        {/* Field tambahan dari backend ditampilkan jika tersedia */}
        {info?.kelompok && <> · Kelompok {info.kelompok}</>}
        {info?.waktuServer && <> · Waktu server {new Date(info.waktuServer).toLocaleTimeString("id-ID")}</>}
      </footer>
    </div>
  );
}

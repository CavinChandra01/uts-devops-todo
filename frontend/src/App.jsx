import { useEffect, useState } from "react";
import { api } from "./api.js";
import { MAX_TITLE, summarize, validateTitle } from "./utils.js";

const FRONTEND_VERSION = import.meta.env.VITE_APP_VERSION || "dev";

export default function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);

  async function refresh() {
    try {
      setTodos(await api.list());
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    api.info().then(setInfo).catch(() => setInfo(null));
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const check = validateTitle(title);
    if (!check.ok) return setError(check.error);
    try {
      await api.create(check.title);
      setTitle("");
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleToggle(todo) {
    try {
      await api.setDone(todo.id, !todo.done);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(todo) {
    try {
      await api.remove(todo.id);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  const stats = summarize(todos);

  return (
    <div className="page">
      <main className="card">
        <header>
          <h1>Daftar Tugas</h1>
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

        {error && <p className="error">{error}</p>}

        <p className="stats">
          {stats.total} tugas · {stats.done} selesai · {stats.remaining} tersisa
        </p>

        {loading ? (
          <p className="empty">Memuat...</p>
        ) : todos.length === 0 ? (
          <p className="empty">Belum ada tugas. Tambahkan tugas pertama Anda.</p>
        ) : (
          <ul className="list">
            {todos.map((t) => (
              <li key={t.id} className={t.done ? "done" : ""}>
                <label>
                  <input type="checkbox" checked={t.done} onChange={() => handleToggle(t)} />
                  <span>{t.title}</span>
                </label>
                <button className="delete" onClick={() => handleDelete(t)} aria-label={`Hapus ${t.title}`}>
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer>
        Frontend {FRONTEND_VERSION} · Backend {info?.version ?? "-"} · {info?.database ? `MySQL ${info.database}` : "Database tidak terhubung"}
      </footer>
    </div>
  );
}

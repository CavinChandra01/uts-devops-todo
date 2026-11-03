// REST API Daftar Tugas. createApp menerima repository agar bisa diuji tanpa database asli.
const express = require("express");
const morgan = require("morgan");

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID tidak valid" });
    return null;
  }
  return id;
}

function createApp(repo, { appVersion = "dev", logging = true } = {}) {
  const app = express();
  app.use(express.json());
  if (logging) app.use(morgan("common"));

  // Liveness: proses Node hidup (dipakai HEALTHCHECK Docker)
  app.get("/healthz", (req, res) => res.json({ status: "ok" }));

  // Readiness + info versi (ditampilkan di footer frontend)
  app.get("/api/info", async (req, res, next) => {
    try {
      res.json({ app: "uts-todo-backend", version: appVersion, database: await repo.version() });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/todos", async (req, res, next) => {
    try {
      res.json(await repo.list());
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/todos", async (req, res, next) => {
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    if (!title || title.length > 200) {
      return res.status(400).json({ error: "Judul tugas wajib diisi (maksimal 200 karakter)" });
    }
    try {
      res.status(201).json(await repo.create(title));
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/todos/:id", async (req, res, next) => {
    const id = parseId(req, res);
    if (id === null) return;
    if (typeof req.body?.done !== "boolean") {
      return res.status(400).json({ error: "Field 'done' harus bernilai true atau false" });
    }
    try {
      const todo = await repo.setDone(id, req.body.done);
      return todo ? res.json(todo) : res.status(404).json({ error: "Tugas tidak ditemukan" });
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/todos/:id", async (req, res, next) => {
    const id = parseId(req, res);
    if (id === null) return;
    try {
      return (await repo.remove(id)) ? res.status(204).end() : res.status(404).json({ error: "Tugas tidak ditemukan" });
    } catch (err) {
      next(err);
    }
  });

  // Penanganan error umum
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  });

  return app;
}

module.exports = { createApp };

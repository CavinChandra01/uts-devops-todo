// REST API Daftar Tugas. createApp menerima repository agar bisa diuji tanpa database asli.
const express = require("express");
const morgan = require("morgan");

const MAX_TITLE = 200;
const STATUSES = ["all", "active", "done"];

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID tidak valid" });
    return null;
  }
  return id;
}

function cleanTitle(value) {
  const title = typeof value === "string" ? value.trim() : "";
  return title && title.length <= MAX_TITLE ? title : null;
}

function createApp(repo, { appVersion = "dev", logging = true } = {}) {
  const app = express();
  app.use(express.json());
  if (logging) app.use(morgan("common"));

  // Liveness: proses Node hidup (dipakai HEALTHCHECK Docker)
  app.get("/healthz", (req, res) => res.json({ status: "ok" }));

  // Info versi (ditampilkan di footer frontend)
  app.get("/api/info", async (req, res, next) => {
    try {
      res.json({ app: "uts-todo-backend", kelompok: "TheTarik", waktuServer: new Date().toISOString(), version: appVersion, database: await repo.version() });
    } catch (err) {
      next(err);
    }
  });

  // Fitur 5: filter status (?status=all|active|done) dan cari judul (?q=kata)
  app.get("/api/todos", async (req, res, next) => {
    const status = typeof req.query.status === "string" ? req.query.status : "all";
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: "Status harus all, active, atau done" });
    }
    if (q.length > MAX_TITLE) {
      return res.status(400).json({ error: `Kata kunci maksimal ${MAX_TITLE} karakter` });
    }
    try {
      res.json(await repo.list({ status, q }));
    } catch (err) {
      next(err);
    }
  });

  // Ringkasan jumlah tugas (tidak terpengaruh filter)
  app.get("/api/todos/stats", async (req, res, next) => {
    try {
      res.json(await repo.stats());
    } catch (err) {
      next(err);
    }
  });

  // Fitur 1: tambah tugas
  app.post("/api/todos", async (req, res, next) => {
    const title = cleanTitle(req.body?.title);
    if (!title) {
      return res.status(400).json({ error: `Judul tugas wajib diisi (maksimal ${MAX_TITLE} karakter)` });
    }
    try {
      res.status(201).json(await repo.create(title));
    } catch (err) {
      next(err);
    }
  });

  // Fitur 2 & 3: edit judul dan/atau tandai selesai
  app.patch("/api/todos/:id", async (req, res, next) => {
    const id = parseId(req, res);
    if (id === null) return;
    const body = req.body || {};
    const changes = {};
    if ("title" in body) {
      const title = cleanTitle(body.title);
      if (!title) return res.status(400).json({ error: `Judul tugas wajib diisi (maksimal ${MAX_TITLE} karakter)` });
      changes.title = title;
    }
    if ("done" in body) {
      if (typeof body.done !== "boolean") {
        return res.status(400).json({ error: "Field 'done' harus bernilai true atau false" });
      }
      changes.done = body.done;
    }
    if (!Object.keys(changes).length) {
      return res.status(400).json({ error: "Kirim minimal salah satu: title atau done" });
    }
    try {
      const todo = await repo.update(id, changes);
      return todo ? res.json(todo) : res.status(404).json({ error: "Tugas tidak ditemukan" });
    } catch (err) {
      next(err);
    }
  });

  // Fitur 4: hapus tugas
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
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  });

  return app;
}

module.exports = { createApp };

// Lapisan akses data (MySQL lewat knex). Dipisah dari server.js agar API mudah diuji.
const path = require("path");
const knex = require("knex");

const TABLE = "todos";
const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

function createRepository(connection, client = "mysql2") {
  const db = knex({ client, connection, useNullAsDefault: client !== "mysql2" });

  return {
    // Menjalankan semua file di folder migrations/ yang belum pernah dijalankan.
    // Perubahan struktur database ikut ter-deploy otomatis lewat CI/CD.
    async migrate() {
      const [batch, files] = await db.migrate.latest({ directory: MIGRATIONS_DIR });
      if (files.length) console.log(`Migrasi database (batch ${batch}): ${files.join(", ")}`);
      else console.log("Database sudah versi terbaru");
    },
    async ping() {
      await db.raw("select 1");
    },
    async version() {
      if (client !== "mysql2") return client;
      const [rows] = await db.raw("select VERSION() as version");
      return rows[0].version;
    },
    // Fitur filter & cari: status = all | active | done, q = kata kunci judul
    async list({ status = "all", q = "" } = {}) {
      const query = db(TABLE).select("id", "title", "done", "created_at").orderBy("id", "desc");
      if (status === "active") query.where("done", false);
      if (status === "done") query.where("done", true);
      if (q) query.where("title", "like", `%${q}%`);
      return (await query).map(normalize);
    },
    async stats() {
      const rows = await db(TABLE).select("done").count({ n: "*" }).groupBy("done");
      let total = 0;
      let done = 0;
      for (const r of rows) {
        total += Number(r.n);
        if (r.done) done += Number(r.n);
      }
      return { total, done, remaining: total - done };
    },
    async create(title) {
      const [id] = await db(TABLE).insert({ title, done: false });
      return normalize(await db(TABLE).where({ id }).first());
    },
    // Fitur edit judul dan tandai selesai (salah satu atau keduanya)
    async update(id, changes) {
      const updated = await db(TABLE).where({ id }).update(changes);
      if (!updated) return null;
      return normalize(await db(TABLE).where({ id }).first());
    },
    async remove(id) {
      return (await db(TABLE).where({ id }).del()) > 0;
    },
    async close() {
      await db.destroy();
    },
  };
}

function normalize(row) {
  return { id: row.id, title: row.title, done: Boolean(row.done), created_at: row.created_at };
}

module.exports = { createRepository };

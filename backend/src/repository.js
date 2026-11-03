// Lapisan akses data (MySQL lewat knex). Dipisah dari server.js agar API mudah diuji.
const knex = require("knex");

const TABLE = "todos";

function createRepository(connection, client = "mysql2") {
  const db = knex({ client, connection, useNullAsDefault: client !== "mysql2" });

  return {
    async migrate() {
      const exists = await db.schema.hasTable(TABLE);
      if (!exists) {
        await db.schema.createTable(TABLE, (t) => {
          t.increments("id").primary();
          t.string("title", 200).notNullable();
          t.boolean("done").notNullable().defaultTo(false);
          t.timestamp("created_at").notNullable().defaultTo(db.fn.now());
        });
      }
    },
    async ping() {
      await db.raw("select 1");
    },
    async version() {
      if (client !== "mysql2") return client;
      const [rows] = await db.raw("select VERSION() as version");
      return rows[0].version;
    },
    async list() {
      const rows = await db(TABLE).select("id", "title", "done", "created_at").orderBy("id", "desc");
      return rows.map(normalize);
    },
    async create(title) {
      const [id] = await db(TABLE).insert({ title, done: false });
      return normalize(await db(TABLE).where({ id }).first());
    },
    async setDone(id, done) {
      const updated = await db(TABLE).where({ id }).update({ done });
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

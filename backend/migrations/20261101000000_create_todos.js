// Migrasi 1: membuat tabel todos.
// Aman untuk database lama: jika tabel sudah ada (dibuat versi sebelumnya), migrasi dilewati.
exports.up = async function (knex) {
  if (await knex.schema.hasTable("todos")) return;
  await knex.schema.createTable("todos", (t) => {
    t.increments("id").primary();
    t.string("title", 200).notNullable();
    t.boolean("done").notNullable().defaultTo(false);
    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("todos");
};

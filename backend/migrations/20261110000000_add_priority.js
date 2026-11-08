// CONTOH PERUBAHAN DATABASE untuk demo CI/CD di video.
//
// Cara demo:
//   1. Salin file ini ke folder backend/migrations/
//   2. git add, commit, push ke main
//   3. Setelah job "CD 2 - Deploy" hijau, backend baru menjalankan migrasi ini otomatis saat start
//   4. Buktikan: docker compose exec db mysql -u todo -p todo -e "DESCRIBE todos;"
//      -> kolom baru "priority" muncul, data lama tetap ada.

exports.up = async (knex) => {
  const exists = await knex.schema.hasColumn("todos", "priority");
  if (!exists) {
    await knex.schema.alterTable("todos", (t) => {
      t.string("priority", 10).notNullable().defaultTo("normal");
    });
  }
};

exports.down = async (knex) => {
  await knex.schema.alterTable("todos", (t) => {
    t.dropColumn("priority");
  });
};

const config = require("./config");
const { createRepository } = require("./repository");
const { createApp } = require("./server");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDatabase(repo, retries = 30) {
  for (let i = 1; i <= retries; i++) {
    try {
      await repo.ping();
      return;
    } catch (err) {
      console.log(`Menunggu database (${i}/${retries}): ${err.code || err.message}`);
      await sleep(2000);
    }
  }
  throw new Error("Database tidak dapat dihubungi");
}

async function main() {
  const repo = createRepository(config.database);
  await waitForDatabase(repo);
  await repo.migrate();

  const app = createApp(repo, { appVersion: config.appVersion });
  const server = app.listen(config.port, () => {
    console.log(`Backend versi ${config.appVersion} berjalan di port ${config.port}`);
  });

  // Graceful shutdown saat container dihentikan (docker stop mengirim SIGTERM)
  const shutdown = (signal) => {
    console.log(`${signal} diterima, menutup server...`);
    server.close(async () => {
      await repo.close();
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

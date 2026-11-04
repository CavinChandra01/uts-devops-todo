// Unit test API dengan repository palsu (in-memory), dijalankan di tahap CI.
const assert = require("assert");
const request = require("supertest");
const { createApp } = require("../src/server");

function fakeRepo() {
  let items = [];
  let nextId = 1;
  return {
    version: async () => "fake-db",
    list: async ({ status = "all", q = "" } = {}) =>
      [...items]
        .reverse()
        .filter((t) => (status === "active" ? !t.done : status === "done" ? t.done : true))
        .filter((t) => t.title.toLowerCase().includes(q.toLowerCase())),
    stats: async () => {
      const done = items.filter((t) => t.done).length;
      return { total: items.length, done, remaining: items.length - done };
    },
    create: async (title) => {
      const t = { id: nextId++, title, done: false, created_at: new Date().toISOString() };
      items.push(t);
      return t;
    },
    update: async (id, changes) => {
      const t = items.find((x) => x.id === id);
      if (!t) return null;
      Object.assign(t, changes);
      return t;
    },
    remove: async (id) => {
      const before = items.length;
      items = items.filter((x) => x.id !== id);
      return items.length < before;
    },
  };
}

describe("API Daftar Tugas", () => {
  let app;
  const add = (title) => request(app).post("/api/todos").send({ title });

  beforeEach(() => {
    app = createApp(fakeRepo(), { appVersion: "test", logging: false });
  });

  describe("Umum", () => {
    it("GET /healthz mengembalikan 200", async () => {
      const res = await request(app).get("/healthz");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, "ok");
    });

    it("GET /api/info menampilkan versi aplikasi", async () => {
      const res = await request(app).get("/api/info");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.version, "test");
    });

    it("ID tidak valid mengembalikan 400", async () => {
      const res = await request(app).delete("/api/todos/abc");
      assert.strictEqual(res.status, 400);
    });
  });

  describe("Fitur 1 - Tambah tugas", () => {
    it("membuat tugas baru dan merapikan spasi", async () => {
      const res = await add("  Belajar Docker  ");
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.title, "Belajar Docker");
      assert.strictEqual(res.body.done, false);
    });

    it("menolak judul kosong", async () => {
      assert.strictEqual((await add("   ")).status, 400);
    });

    it("menolak judul lebih dari 200 karakter", async () => {
      assert.strictEqual((await add("a".repeat(201))).status, 400);
    });
  });

  describe("Fitur 2 - Edit judul tugas", () => {
    it("mengubah judul tugas", async () => {
      const created = await add("Judul lama");
      const res = await request(app).patch(`/api/todos/${created.body.id}`).send({ title: "Judul baru" });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.title, "Judul baru");
    });

    it("menolak judul baru yang kosong", async () => {
      const created = await add("Judul lama");
      const res = await request(app).patch(`/api/todos/${created.body.id}`).send({ title: "" });
      assert.strictEqual(res.status, 400);
    });

    it("menolak PATCH tanpa title maupun done", async () => {
      const created = await add("Tugas");
      const res = await request(app).patch(`/api/todos/${created.body.id}`).send({});
      assert.strictEqual(res.status, 400);
    });

    it("mengembalikan 404 untuk tugas yang tidak ada", async () => {
      const res = await request(app).patch("/api/todos/99").send({ title: "X" });
      assert.strictEqual(res.status, 404);
    });
  });

  describe("Fitur 3 - Tandai selesai", () => {
    it("menandai tugas selesai", async () => {
      const created = await add("CI/CD");
      const res = await request(app).patch(`/api/todos/${created.body.id}`).send({ done: true });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.done, true);
    });

    it("menolak nilai done yang bukan boolean", async () => {
      const created = await add("Validasi");
      const res = await request(app).patch(`/api/todos/${created.body.id}`).send({ done: "ya" });
      assert.strictEqual(res.status, 400);
    });
  });

  describe("Fitur 4 - Hapus tugas", () => {
    it("menghapus tugas, lalu 404 jika diulang", async () => {
      const created = await add("Hapus saya");
      assert.strictEqual((await request(app).delete(`/api/todos/${created.body.id}`)).status, 204);
      assert.strictEqual((await request(app).delete(`/api/todos/${created.body.id}`)).status, 404);
    });
  });

  describe("Fitur 5 - Filter status & cari", () => {
    beforeEach(async () => {
      await add("Membuat Dockerfile");
      const b = await add("Setup GitHub Actions");
      await add("Menulis laporan");
      await request(app).patch(`/api/todos/${b.body.id}`).send({ done: true });
    });

    it("mengembalikan semua tugas, terbaru lebih dulu", async () => {
      const res = await request(app).get("/api/todos");
      assert.deepStrictEqual(res.body.map((t) => t.title), ["Menulis laporan", "Setup GitHub Actions", "Membuat Dockerfile"]);
    });

    it("filter status=active hanya tugas yang belum selesai", async () => {
      const res = await request(app).get("/api/todos?status=active");
      assert.deepStrictEqual(res.body.map((t) => t.title), ["Menulis laporan", "Membuat Dockerfile"]);
    });

    it("filter status=done hanya tugas yang sudah selesai", async () => {
      const res = await request(app).get("/api/todos?status=done");
      assert.deepStrictEqual(res.body.map((t) => t.title), ["Setup GitHub Actions"]);
    });

    it("cari berdasarkan kata kunci judul", async () => {
      const res = await request(app).get("/api/todos?q=docker");
      assert.deepStrictEqual(res.body.map((t) => t.title), ["Membuat Dockerfile"]);
    });

    it("menolak status yang tidak dikenal", async () => {
      assert.strictEqual((await request(app).get("/api/todos?status=apa")).status, 400);
    });

    it("ringkasan jumlah tugas tidak terpengaruh filter", async () => {
      const res = await request(app).get("/api/todos/stats");
      assert.deepStrictEqual(res.body, { total: 3, done: 1, remaining: 2 });
    });
  });
});

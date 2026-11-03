// Unit test API dengan repository palsu (in-memory), dijalankan di tahap CI.
const assert = require("assert");
const request = require("supertest");
const { createApp } = require("../src/server");

function fakeRepo() {
  let items = [];
  let nextId = 1;
  return {
    version: async () => "fake-db",
    list: async () => [...items].reverse(),
    create: async (title) => {
      const t = { id: nextId++, title, done: false, created_at: new Date().toISOString() };
      items.push(t);
      return t;
    },
    setDone: async (id, done) => {
      const t = items.find((x) => x.id === id);
      if (!t) return null;
      t.done = done;
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
  beforeEach(() => {
    app = createApp(fakeRepo(), { appVersion: "test", logging: false });
  });

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

  it("POST /api/todos membuat tugas baru", async () => {
    const res = await request(app).post("/api/todos").send({ title: "  Belajar Docker  " });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.title, "Belajar Docker");
    assert.strictEqual(res.body.done, false);
  });

  it("POST /api/todos menolak judul kosong", async () => {
    const res = await request(app).post("/api/todos").send({ title: "   " });
    assert.strictEqual(res.status, 400);
  });

  it("POST /api/todos menolak judul lebih dari 200 karakter", async () => {
    const res = await request(app).post("/api/todos").send({ title: "a".repeat(201) });
    assert.strictEqual(res.status, 400);
  });

  it("PATCH /api/todos/:id menandai tugas selesai", async () => {
    const created = await request(app).post("/api/todos").send({ title: "CI/CD" });
    const res = await request(app).patch(`/api/todos/${created.body.id}`).send({ done: true });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.done, true);
  });

  it("PATCH /api/todos/:id menolak nilai done yang bukan boolean", async () => {
    const created = await request(app).post("/api/todos").send({ title: "Validasi" });
    const res = await request(app).patch(`/api/todos/${created.body.id}`).send({ done: "ya" });
    assert.strictEqual(res.status, 400);
  });

  it("DELETE /api/todos/:id menghapus tugas, lalu 404 jika diulang", async () => {
    const created = await request(app).post("/api/todos").send({ title: "Hapus saya" });
    const del = await request(app).delete(`/api/todos/${created.body.id}`);
    assert.strictEqual(del.status, 204);
    const again = await request(app).delete(`/api/todos/${created.body.id}`);
    assert.strictEqual(again.status, 404);
  });

  it("GET /api/todos mengembalikan daftar terbaru lebih dulu", async () => {
    await request(app).post("/api/todos").send({ title: "Pertama" });
    await request(app).post("/api/todos").send({ title: "Kedua" });
    const res = await request(app).get("/api/todos");
    assert.deepStrictEqual(res.body.map((t) => t.title), ["Kedua", "Pertama"]);
  });

  it("ID tidak valid mengembalikan 400", async () => {
    const res = await request(app).delete("/api/todos/abc");
    assert.strictEqual(res.status, 400);
  });
});

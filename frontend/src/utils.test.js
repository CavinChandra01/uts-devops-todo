import { describe, expect, it } from "vitest";
import { buildQuery, emptyMessage, validateTitle } from "./utils.js";

describe("validateTitle (fitur tambah & edit)", () => {
  it("menolak judul kosong atau hanya spasi", () => {
    expect(validateTitle("   ").ok).toBe(false);
    expect(validateTitle(undefined).ok).toBe(false);
  });
  it("menolak judul lebih dari 200 karakter", () => {
    expect(validateTitle("a".repeat(201)).ok).toBe(false);
  });
  it("menerima dan merapikan judul yang valid", () => {
    expect(validateTitle("  Belajar Docker ")).toEqual({ ok: true, title: "Belajar Docker" });
  });
});

describe("buildQuery (fitur filter & cari)", () => {
  it("tanpa filter menghasilkan string kosong", () => {
    expect(buildQuery()).toBe("");
    expect(buildQuery({ status: "all", q: "  " })).toBe("");
  });
  it("menyertakan status dan kata kunci", () => {
    expect(buildQuery({ status: "done", q: " docker " })).toBe("?status=done&q=docker");
  });
  it("meng-encode karakter khusus pada kata kunci", () => {
    expect(buildQuery({ q: "CI/CD & test" })).toBe("?q=CI%2FCD+%26+test");
  });
});

describe("emptyMessage", () => {
  it("menyesuaikan pesan dengan filter yang aktif", () => {
    expect(emptyMessage({ q: "abc" })).toContain("abc");
    expect(emptyMessage({ status: "done" })).toBe("Belum ada tugas yang selesai.");
    expect(emptyMessage()).toContain("Belum ada tugas");
  });
});

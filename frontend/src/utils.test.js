import { describe, expect, it } from "vitest";
import { summarize, validateTitle } from "./utils.js";

describe("validateTitle", () => {
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

describe("summarize", () => {
  it("menghitung tugas selesai dan tersisa", () => {
    const todos = [{ done: true }, { done: false }, { done: false }];
    expect(summarize(todos)).toEqual({ total: 3, done: 1, remaining: 2 });
  });
});

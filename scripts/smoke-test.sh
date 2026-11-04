#!/usr/bin/env bash
# Smoke test end-to-end terhadap stack yang sedang berjalan (dipakai tahap CI integration test).
# Memastikan jalur frontend (Nginx) -> backend (Express) -> database (MySQL) berfungsi.
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
pass() { echo "  [OK] $1"; }
fail() { echo "  [GAGAL] $1"; exit 1; }

echo "Smoke test terhadap $BASE_URL"

status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
[ "$status" = "200" ] && pass "Frontend mengembalikan HTTP 200" || fail "Frontend HTTP $status"

curl -s "$BASE_URL/" | grep -q "<div id=\"root\">" && pass "Halaman React tersaji" || fail "Halaman React tidak ditemukan"

info=$(curl -sf "$BASE_URL/api/info") || fail "GET /api/info gagal"
echo "$info" | jq -e '.database | length > 0' >/dev/null && pass "Backend terhubung ke MySQL: $(echo "$info" | jq -r .database)" || fail "Backend tidak terhubung ke database"

created=$(curl -sf -X POST "$BASE_URL/api/todos" -H "Content-Type: application/json" -d '{"title":"Smoke test CI"}') || fail "POST /api/todos gagal"
id=$(echo "$created" | jq -r .id)
pass "Tugas dibuat dengan id $id"

curl -sf "$BASE_URL/api/todos" | jq -e --argjson id "$id" 'map(.id) | index($id) != null' >/dev/null \
  && pass "Tugas tersimpan di database" || fail "Tugas tidak ditemukan di daftar"

# Fitur 2: edit judul
curl -sf -X PATCH "$BASE_URL/api/todos/$id" -H "Content-Type: application/json" -d '{"title":"Smoke test CI (diedit)"}' \
  | jq -e '.title == "Smoke test CI (diedit)"' >/dev/null \
  && pass "Judul tugas berhasil diedit" || fail "PATCH title gagal"

# Fitur 3: tandai selesai
curl -sf -X PATCH "$BASE_URL/api/todos/$id" -H "Content-Type: application/json" -d '{"done":true}' | jq -e '.done == true' >/dev/null \
  && pass "Tugas berhasil ditandai selesai" || fail "PATCH done gagal"

# Fitur 5: filter status dan pencarian (diproses dengan query SQL di MySQL)
curl -sf "$BASE_URL/api/todos?status=done" | jq -e --argjson id "$id" 'map(.id) | index($id) != null' >/dev/null \
  && pass "Filter status=done menampilkan tugas" || fail "Filter status=done gagal"
curl -sf "$BASE_URL/api/todos?status=active" | jq -e --argjson id "$id" 'map(.id) | index($id) == null' >/dev/null \
  && pass "Filter status=active menyembunyikan tugas selesai" || fail "Filter status=active gagal"
curl -sf "$BASE_URL/api/todos?q=diedit" | jq -e --argjson id "$id" 'map(.id) | index($id) != null' >/dev/null \
  && pass "Pencarian q=diedit menemukan tugas" || fail "Pencarian gagal"

# Ringkasan jumlah tugas
curl -sf "$BASE_URL/api/todos/stats" | jq -e '.total >= 1 and .done >= 1 and (.total == .done + .remaining)' >/dev/null \
  && pass "Ringkasan /api/todos/stats konsisten" || fail "Ringkasan gagal"

status=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/todos/$id")
[ "$status" = "204" ] && pass "Tugas berhasil dihapus" || fail "DELETE HTTP $status"

status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/todos" -H "Content-Type: application/json" -d '{"title":""}')
[ "$status" = "400" ] && pass "Validasi input kosong berjalan (HTTP 400)" || fail "Validasi HTTP $status"

status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/todos?status=salah")
[ "$status" = "400" ] && pass "Validasi filter status (HTTP 400)" || fail "Validasi filter HTTP $status"

echo "Semua smoke test lolos."

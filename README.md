# Daftar Tugas: Deployment Full Stack dengan Docker dan CI/CD

Proyek UTS mata kuliah Pengembangan dan Operasi. Aplikasi web **Daftar Tugas (To-Do List)** full stack yang di-deploy menggunakan **container Docker** dengan pipeline **Continuous Integration (CI)** dan **Continuous Deployment (CD)** menggunakan GitHub Actions.

| Lapisan | Teknologi | Container |
|---|---|---|
| Frontend | React 19 + Vite, disajikan oleh Nginx 1.28 | `uts-todo-frontend` |
| Backend | Node.js 22 + Express 5 (REST API) | `uts-todo-backend` |
| Database | MySQL 8.4 | `mysql:8.4` |

## Anggota kelompok

| NIM | Nama | Peran |
|---|---|---|
| ... | ... | Container (Dockerfile & Docker Compose) |
| ... | ... | Continuous Integration |
| ... | ... | Continuous Deployment |
| ... | ... | Laporan & video |
| ... | ... | Dokumentasi & pengujian aplikasi |

## Fitur aplikasi

| No | Fitur | Cara pakai |
|---|---|---|
| 1 | **Tambah tugas** | Tulis judul di kotak isian (maks. 200 karakter), klik **Tambah** |
| 2 | **Edit judul tugas** | Klik **Edit** di samping tugas, ubah judul, klik **Simpan** (atau **Batal** / tombol Esc) |
| 3 | **Tandai selesai** | Centang kotak di samping tugas; tugas dicoret. Hilangkan centang untuk membatalkan |
| 4 | **Hapus tugas** | Klik **Hapus** di samping tugas |
| 5 | **Filter & pencarian** | Pilih tab **Semua / Belum selesai / Selesai**, atau ketik kata kunci di kotak **Cari tugas** |

Selain itu, ringkasan di atas daftar menampilkan jumlah tugas, yang selesai, dan yang tersisa. Footer menampilkan versi frontend, versi backend (commit SHA), dan versi MySQL yang sedang berjalan. Semua data disimpan di MySQL, sehingga filter dan pencarian diproses oleh query SQL di database.

## Arsitektur container

```mermaid
flowchart LR
    U[Browser pengguna] -->|port 8080| F[frontend<br/>Nginx + React]
    F -->|/api via frontend-net| B[backend<br/>Express]
    B -->|SQL via backend-net| D[(db<br/>MySQL 8.4)]
    D --- V[(volume db-data)]
```

- **Dua network terpisah:** `frontend-net` (frontend ↔ backend) dan `backend-net` (backend ↔ database). Database tidak bisa diakses langsung dari frontend maupun dari luar.
- **Hanya satu port yang dibuka** ke luar: 8080 (frontend). Backend dan MySQL hanya dapat diakses di dalam network Docker.
- **Volume `db-data`** menyimpan data MySQL sehingga data tetap ada walau container dihapus atau di-deploy ulang.
- **Healthcheck** di setiap container; `depends_on: condition: service_healthy` memastikan urutan start: MySQL → backend → frontend.
- **Multi-stage build:** image akhir hanya berisi file yang dibutuhkan (frontend akhir berbasis `nginx:alpine`, backend tanpa dev-dependencies).
- **User non-root** pada container backend, `restart: unless-stopped`, konfigurasi lewat environment variable (`.env`), dan **graceful shutdown** saat `docker stop`.

## Menjalankan dengan Docker (lokal)

Prasyarat: [Docker Desktop](https://www.docker.com/products/docker-desktop/) sudah terpasang dan berjalan.

```bash
# 1. Salin file konfigurasi dan isi password
cp .env.example .env            # Windows PowerShell: copy .env.example .env

# 2. Build image dan jalankan semua container
docker compose up -d --build

# 3. Cek status (tunggu sampai semua "healthy")
docker compose ps

# 4. Buka http://localhost:8080
```

Perintah berguna:

```bash
docker compose logs -f backend                 # melihat log backend
docker compose exec db mysql -u todo -p todo   # masuk ke MySQL (password dari .env)
docker compose down                            # menghentikan container (data tetap ada)
docker compose down -v                         # menghentikan dan menghapus data
```

## Pipeline CI/CD

File: [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml)

```mermaid
flowchart LR
    P[git push] --> U[CI 1<br/>Unit test<br/>backend & frontend]
    U --> I[CI 2<br/>Build image &<br/>integration test]
    I -->|branch main| H[CD 1<br/>Push image ke<br/>Docker Hub]
    H --> D[CD 2<br/>Deploy ke server<br/>self-hosted runner]
```

| Tahap | Kapan berjalan | Isi |
|---|---|---|
| **CI 1 - Lint & unit test** | Setiap push & pull request | `npm run lint` (ESLint) lalu `npm test` untuk backend (Mocha + Supertest, 19 test) dan frontend (Vitest, 7 test), lalu build frontend |
| **CI 2 - Integration test** | Setelah CI 1 lolos | `docker compose build`, menjalankan 3 container sampai healthy, lalu `scripts/smoke-test.sh` (14 pengecekan) menguji alur frontend → backend → MySQL untuk kelima fitur dan validasi input |
| **CD 1 - Push image** | Push ke `main` setelah CI lolos | Build dan push image ke Docker Hub dengan tag `latest` dan 7 karakter commit SHA |
| **CD 2 - Deploy** | Setelah CD 1 | Di server (self-hosted runner): `docker compose pull` lalu `docker compose up -d --wait`, container diganti dengan versi baru tanpa kehilangan data |

Jika satu tahap gagal, tahap berikutnya tidak dijalankan, sehingga kode yang rusak tidak pernah ter-deploy.

**Kenapa self-hosted runner, bukan Watchtower?** Watchtower memantau Docker Hub secara berkala dan mengganti container ketika ada image baru. Kelompok ini memakai job deploy di self-hosted runner karena deploy hanya terjadi setelah semua tes lolos, statusnya terlihat di tab Actions bersama tahap CI, dan `docker compose up --wait` memastikan container baru sudah healthy sebelum job dinyatakan berhasil.

### Setup CI/CD (sekali saja)

1. **Docker Hub:** buat akun di hub.docker.com, lalu **Account settings → Personal access tokens → Generate new token** (akses *Read & Write*). Simpan token-nya.
2. **GitHub → Settings → Secrets and variables → Actions:**
   - Tab **Variables**: `DOCKERHUB_USERNAME` = username Docker Hub
   - Tab **Secrets**: `DOCKERHUB_TOKEN` (token dari langkah 1), `DB_PASSWORD`, `DB_ROOT_PASSWORD` (password database di server)
3. **Server (self-hosted runner):** di laptop/PC yang menjadi server dan sudah menjalankan Docker Desktop:
   - GitHub → **Settings → Actions → Runners → New self-hosted runner**, pilih sistem operasi (misalnya Windows x64)
   - Jalankan perintah yang ditampilkan GitHub di PowerShell (download, `config.cmd`), lalu jalankan runner dengan `./run.cmd`
   - Runner berstatus **Idle** di halaman Runners berarti siap menerima job deploy
4. Push ke branch `main`, lalu pantau di tab **Actions**.

> **Keamanan:** self-hosted runner menjalankan kode dari repository ini. Jika repository **public**, aktifkan **Settings → Actions → General → "Require approval for all external contributors"** agar pull request dari orang lain tidak bisa menjalankan job di server.

### Demonstrasi CD (frontend, backend, database)

Setiap perubahan di-push oleh anggota yang berbeda dari akun GitHub masing-masing (anggota diundang lewat **Settings → Collaborators**).

| Perubahan | Contoh | Bukti setelah job CD 2 hijau |
|---|---|---|
| Frontend | Ubah teks subtitle di `frontend/src/App.jsx` | Refresh browser: teks berubah, footer menampilkan commit SHA baru |
| Backend | Ubah `MAX_TITLE` di `backend/src/server.js`, atau tambah field di respons `/api/info` | Buka `http://localhost:8080/api/info` |
| Database | Salin `contoh-demo/20261110000000_add_priority.js` ke `backend/migrations/` | `docker compose exec db mysql -u todo -p todo -e "DESCRIBE todos;"` menampilkan kolom `priority`, data lama tetap ada |

## Migrasi database

Struktur tabel dikelola dengan **knex migrations** di folder `backend/migrations/`. Saat container backend start, `migrate.latest()` menjalankan migrasi yang belum pernah dijalankan dan mencatatnya di tabel `knex_migrations`. Perubahan struktur database cukup dilakukan dengan menambah file migrasi baru, lalu push. Pipeline akan menguji dan men-deploy-nya seperti kode biasa.

## Linting dan test lokal

```bash
cd backend  && npm ci && npm run lint && npm test
cd frontend && npm ci && npm run lint && npm test && npm run build
```

## Struktur repository

```
.
├── .github/workflows/ci-cd.yml   # pipeline CI/CD
├── backend/
│   ├── Dockerfile                # multi-stage: deps, test, production (non-root, healthcheck)
│   ├── .dockerignore
│   ├── healthcheck.js            # dipanggil HEALTHCHECK Docker
│   ├── eslint.config.js          # aturan linting
│   ├── migrations/               # migrasi struktur tabel (knex)
│   ├── src/                      # config, repository (MySQL/knex), server (REST API), index
│   └── test/api.test.js          # unit test API
├── frontend/
│   ├── Dockerfile                # multi-stage: build (Node) -> Nginx
│   ├── .dockerignore
│   ├── nginx.conf                # sajikan React + reverse proxy /api ke backend
│   ├── eslint.config.js          # aturan linting
│   └── src/                      # aplikasi React
├── contoh-demo/                  # contoh migrasi database untuk demo video
├── scripts/smoke-test.sh         # integration test end-to-end
├── compose.yaml                  # definisi 3 service, 2 network, 1 volume
└── .env.example                  # contoh konfigurasi (salin menjadi .env)
```

## Library dan versi

Versi berikut terkunci di `package-lock.json` sehingga build di laptop dan di CI selalu sama.

| Bagian | Library / image | Versi | Fungsi |
|---|---|---|---|
| Frontend | react, react-dom | 19.3.1 | Komponen antarmuka |
| Frontend | vite | 7.3.7 | Build tool |
| Frontend | @vitejs/plugin-react | 5.2.0 | Dukungan JSX di Vite |
| Frontend | vitest | 3.2.7 | Unit test |
| Frontend | eslint-plugin-react-hooks | 7.1.1 | Aturan lint React Hooks |
| Backend | express | 5.3.0 | Web framework REST API |
| Backend | knex | 3.3.0 | Query builder & migrasi |
| Backend | mysql2 | 3.24.6 | Driver MySQL |
| Backend | morgan | 1.12.1 | Log request HTTP |
| Backend | mocha | 11.8.0 | Test runner |
| Backend | supertest | 7.3.1 | Test endpoint HTTP |
| Keduanya | eslint, @eslint/js | 10.14.0, 10.0.1 | Linting |
| Image | node | 22-alpine | Runtime backend & tahap build frontend |
| Image | nginx | 1.28-alpine | Web server frontend & reverse proxy |
| Image | mysql | 8.4 | Database |

## REST API

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/healthz` | Health check backend |
| GET | `/api/info` | Versi backend dan MySQL |
| GET | `/api/todos?status=&q=` | Daftar tugas (terbaru di atas). `status`: `all`, `active`, `done`; `q`: kata kunci judul |
| GET | `/api/todos/stats` | Ringkasan `{total, done, remaining}` |
| POST | `/api/todos` | Tambah tugas, body `{"title": "..."}` |
| PATCH | `/api/todos/:id` | Edit judul dan/atau status, body `{"title": "..."}` atau `{"done": true}` |
| DELETE | `/api/todos/:id` | Hapus tugas |

## Sumber referensi

Aplikasi ini dikembangkan dari contoh resmi Docker:

- [docker/awesome-compose: react-express-mysql](https://github.com/docker/awesome-compose/tree/master/react-express-mysql) (lisensi CC0 1.0) sebagai kerangka arsitektur React + Express + MySQL dengan Docker Compose
- Backend contoh tersebut berbasis [node-docker-good-defaults](https://github.com/BretFisher/node-docker-good-defaults) oleh Bret Fisher (lisensi MIT)

Pengembangan yang dilakukan kelompok: lima fitur Daftar Tugas (tambah, edit, tandai selesai, hapus, filter & pencarian) di frontend dan backend, migrasi database dengan knex, linting ESLint, unit test, Dockerfile produksi multi-stage dengan user non-root, konfigurasi Nginx reverse proxy, pemisahan network, healthcheck berantai, smoke test, serta pipeline CI/CD GitHub Actions dengan Docker Hub dan self-hosted runner.

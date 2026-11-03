// Dipanggil oleh HEALTHCHECK di Dockerfile: exit 0 jika /healthz mengembalikan HTTP 200.
const http = require("http");

const req = http.request(
  { host: "127.0.0.1", port: process.env.PORT || 3000, path: "/healthz", timeout: 2000 },
  (res) => process.exit(res.statusCode === 200 ? 0 : 1)
);
req.on("error", () => process.exit(1));
req.on("timeout", () => {
  req.destroy();
  process.exit(1);
});
req.end();

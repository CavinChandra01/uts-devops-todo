const fs = require("fs");

// Password boleh diberikan langsung (DB_PASSWORD) atau lewat file secret (DB_PASSWORD_FILE).
function readPassword() {
  if (process.env.DB_PASSWORD_FILE) {
    return fs.readFileSync(process.env.DB_PASSWORD_FILE, "utf8").trim();
  }
  return process.env.DB_PASSWORD || "";
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  appVersion: process.env.APP_VERSION || "dev",
  database: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || "todo",
    user: process.env.DB_USER || "todo",
    password: readPassword(),
  },
};

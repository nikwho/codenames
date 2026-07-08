/**
 * PM2 process file for the Codenames API.
 * Run from a release root (or via `current` symlink):
 *   pm2 startOrReload ecosystem.config.cjs --update-env
 *
 * Keep a single fork instance for Socket.IO (no cluster / sticky-session issues).
 */
const path = require("node:path");

const APP_DIR = process.env.APP_DIR || "/var/www/codenames";
const SERVER_CWD = path.join(APP_DIR, "current", "server");

module.exports = {
  apps: [
    {
      name: "codenames-api",
      cwd: SERVER_CWD,
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: process.env.APP_PORT || process.env.PORT || "3001"
      },
      max_memory_restart: "512M",
      time: true
    }
  ]
};

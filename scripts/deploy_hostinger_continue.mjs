#!/usr/bin/env node
import axios from "/Users/simonemenarbin/.npm/_npx/a7204b5813574340/node_modules/axios/index.js";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const domain = process.env.HOSTINGER_DOMAIN || "red-otter-906369.hostingersite.com";
const username = process.env.HOSTINGER_USERNAME || "u246526610";
function loadToken() {
  if (process.env.HOSTINGER_API_TOKEN) return process.env.HOSTINGER_API_TOKEN.trim();
  const fileToken = path.join(os.homedir(), ".config/hostinger/api-token");
  if (fs.existsSync(fileToken)) return fs.readFileSync(fileToken, "utf8").trim();
  const phpCfg = "/Users/simonemenarbin/cloud-cina-b2b/data/hostinger-config.php";
  if (fs.existsSync(phpCfg)) {
    const m = fs.readFileSync(phpCfg, "utf8").match(/'api_token'\s*=>\s*'([^']+)'/);
    if (m) return m[1];
  }
  throw new Error("Hostinger API token not found");
}
const token = loadToken();

const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const api = async (method, p, data) => {
  const res = await axios({
    method,
    url: "https://developers.hostinger.com/" + p.replace(/^\//, ""),
    headers,
    data,
    validateStatus: () => true,
  });
  return { status: res.status, data: res.data, headers: res.headers };
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const asList = (d) => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);

async function tusUpload(url, authKey, restAuthKey, dest, filePath) {
  const size = fs.statSync(filePath).size;
  const create = await axios({
    method: "POST",
    url: `${url.replace(/\/$/, "")}/${dest}?override=true`,
    headers: {
      "X-Auth": authKey,
      "X-Auth-Rest": restAuthKey,
      "Tus-Resumable": "1.0.0",
      "Upload-Length": String(size),
      "Upload-Offset": "0",
    },
    validateStatus: () => true,
  });
  console.log("tus create", create.status);
  if (![200, 201].includes(create.status)) {
    throw new Error("tus create failed " + JSON.stringify(create.data));
  }
  const patch = await axios({
    method: "PATCH",
    url: `${url.replace(/\/$/, "")}/${dest}?override=true`,
    headers: {
      "X-Auth": authKey,
      "X-Auth-Rest": restAuthKey,
      "Tus-Resumable": "1.0.0",
      "Content-Type": "application/offset+octet-stream",
      "Upload-Offset": "0",
    },
    data: fs.readFileSync(filePath),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: () => true,
  });
  console.log("tus patch", patch.status, "offset", patch.headers["upload-offset"]);
  if (![200, 204].includes(patch.status)) {
    throw new Error("tus patch failed " + JSON.stringify(patch.data));
  }
}

// Ensure build script + env for seed/migrate
const pkgPath = path.join(ROOT, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.scripts.build =
  "npx prisma generate && NODE_OPTIONS='--max-old-space-size=1536' next build --webpack";
pkg.scripts.start =
  "npx prisma migrate deploy && npx tsx prisma/seed.ts && next start -H 0.0.0.0 -p ${PORT:-3000}";
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
fs.writeFileSync(path.join(ROOT, ".env"), 'DATABASE_URL="file:./prod.db"\nNODE_ENV=production\n');

const zipPath = path.join(ROOT, `rotta_erp_deploy.zip`);
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
const zip = spawnSync(
  "zip",
  [
    "-rq",
    zipPath,
    ".",
    "-x",
    "node_modules/*",
    ".next/*",
    ".git/*",
    "prisma/dev.db",
    "prisma/dev.db-journal",
    "*.db-journal",
    ".env.local",
    "rotta_erp_*.zip",
  ],
  { cwd: ROOT, encoding: "utf8" },
);
if (zip.status !== 0) throw new Error(zip.stderr || "zip failed");
console.log("zip", fs.statSync(zipPath).size);

console.log("1 upload-urls");
const up = await api("POST", "api/hosting/v1/files/upload-urls", { username, domain });
console.log(up.status, JSON.stringify(up.data).slice(0, 200));
if (up.status !== 200) throw new Error("upload-urls failed");
const { url, auth_key, rest_auth_key } = up.data;

console.log("2 tus upload app.zip");
await tusUpload(url, auth_key, rest_auth_key, "app.zip", zipPath);

console.log("3 env vars");
function loadImapPassword() {
  if (process.env.ROTTA_IMAP_PASSWORD) return process.env.ROTTA_IMAP_PASSWORD;
  const phpCfg = "/Users/simonemenarbin/cloud-cina-b2b/data/mail-config.php";
  if (fs.existsSync(phpCfg)) {
    const m = fs.readFileSync(phpCfg, "utf8").match(/'pass'\s*=>\s*'([^']+)'/);
    if (m) return m[1];
  }
  return null;
}
const imapPass = loadImapPassword();
const envVars = [
  { key: "DATABASE_URL", value: "file:./prod.db" },
  { key: "NODE_ENV", value: "production" },
];
if (imapPass) envVars.push({ key: "ROTTA_IMAP_PASSWORD", value: imapPass });
const env = await api(
  "PUT",
  `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds/settings/env`,
  { env_vars: envVars },
);
console.log("env", env.status, "imap_env", Boolean(imapPass));

console.log("4 settings from archive");
const settings = await api(
  "GET",
  `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds/settings/from-archive?archive_path=app.zip`,
);
console.log("settings", settings.status, JSON.stringify(settings.data).slice(0, 800));
const detected = settings.data?.data || settings.data || {};

const buildPayload = {
  node_version: detected.node_version || 22,
  app_type: detected.app_type || "next",
  build_script: detected.build_script || "build",
  root_directory: detected.root_directory || ".",
  package_manager: detected.package_manager || "npm",
  source_type: "archive",
  source_options: { archive_path: "app.zip" },
};
if (detected.output_directory) buildPayload.output_directory = detected.output_directory;
if (detected.entry_file) buildPayload.entry_file = detected.entry_file;

console.log("5 save settings");
const save = await api(
  "PUT",
  `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds/settings`,
  buildPayload,
);
console.log("save", save.status, JSON.stringify(save.data).slice(0, 300));

console.log("6 start build", buildPayload);
const build = await api(
  "POST",
  `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds`,
  buildPayload,
);
console.log("build", build.status, JSON.stringify(build.data).slice(0, 500));
if (build.status >= 300) throw new Error("build start failed");

console.log("7 poll");
let latest = null;
for (let i = 0; i < 60; i++) {
  await sleep(15000);
  const builds = await api(
    "GET",
    `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds?per_page=5`,
  );
  latest = asList(builds.data)[0] || builds.data?.data?.[0] || builds.data;
  const state = latest?.state || latest?.status;
  console.log(`poll ${i + 1}`, state, latest?.uuid || "");
  if (["completed", "failed"].includes(state)) break;
}

if (latest?.state === "failed" || latest?.status === "failed") {
  const uuid = latest.uuid;
  const logs = await api(
    "GET",
    `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds/${uuid}/logs`,
  );
  console.error("LOGS", JSON.stringify(logs.data).slice(0, 5000));
  const analysis = await api(
    "GET",
    `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds/${uuid}/analysis`,
  );
  console.error("ANALYSIS", JSON.stringify(analysis.data).slice(0, 2000));
  process.exit(1);
}

fs.mkdirSync(path.join(ROOT, ".hostinger"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, ".hostinger", "site.json"),
  JSON.stringify({ domain, username, type: "nodejs", provisional: true }, null, 2) + "\n",
);

const live = await axios.get(`https://${domain}/`, { validateStatus: () => true, timeout: 30000 });
console.log("LIVE", live.status, String(live.data).includes("Rotta") ? "Rotta OK" : "check");
console.log(`URL: https://${domain}/`);
console.log("Login: demo@rotta.erp / rotta-demo");

#!/usr/bin/env node
/**
 * Create provisional free Hostinger subdomain + deploy Rotta ERP (Next.js).
 * Auth: HOSTINGER_API_TOKEN env (preferred) or ~/.config/hostinger-mcp/credentials.json
 */
import axios from "/Users/simonemenarbin/.npm/_npx/a7204b5813574340/node_modules/axios/index.js";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ORDER_ID = Number(process.env.HOSTINGER_ORDER_ID || 1006647561);
const BASE = "https://developers.hostinger.com/";
const CRED_PATH = path.join(os.homedir(), ".config/hostinger-mcp/credentials.json");

function loadToken() {
  if (process.env.HOSTINGER_API_TOKEN) return process.env.HOSTINGER_API_TOKEN;
  const fileToken = path.join(os.homedir(), ".config/hostinger/api-token");
  if (fs.existsSync(fileToken)) {
    return fs.readFileSync(fileToken, "utf8").trim();
  }
  const phpCfg = "/Users/simonemenarbin/cloud-cina-b2b/data/hostinger-config.php";
  if (fs.existsSync(phpCfg)) {
    const m = fs.readFileSync(phpCfg, "utf8").match(/'api_token'\s*=>\s*'([^']+)'/);
    if (m) return m[1];
  }
  if (fs.existsSync(CRED_PATH)) {
    const creds = JSON.parse(fs.readFileSync(CRED_PATH, "utf8"));
    if (creds.access_token) return creds.access_token;
  }
  throw new Error("Hostinger API token not found (env / ~/.config/hostinger/api-token / hostinger-config.php)");
}

const token = loadToken();
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function api(method, apiPath, data) {
  const res = await axios({
    method,
    url: BASE + apiPath.replace(/^\//, ""),
    headers,
    data,
    validateStatus: () => true,
  });
  return { status: res.status, data: res.data, headers: res.headers };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function asList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

async function waitSetup(domain) {
  for (let i = 0; i < 40; i++) {
    const setups = await api(
      "GET",
      `api/hosting/v1/website-setups?domain=${encodeURIComponent(domain)}`,
    );
    const list = asList(setups.data);
    const item = list.find((s) => s.domain === domain) || list[0];
    const status = item?.status;
    console.log(`   setup poll ${i + 1}:`, status || `http ${setups.status}`);
    if (status === "completed") return item;
    if (status === "failed") throw new Error("website setup failed");

    const sites = await api(
      "GET",
      `api/hosting/v1/websites?domain=${encodeURIComponent(domain)}&per_page=20`,
    );
    const site = asList(sites.data).find((s) => s.domain === domain);
    if (site?.username && (!item || status === "completed")) {
      // sometimes website appears before setups list is useful
      if (i >= 2) return { domain, website: site };
    }
    await sleep(12000);
  }
  throw new Error("setup timeout");
}

async function getWebsite(domain) {
  const sites = await api(
    "GET",
    `api/hosting/v1/websites?domain=${encodeURIComponent(domain)}&per_page=50`,
  );
  const site = asList(sites.data).find((s) => s.domain === domain);
  if (!site) throw new Error("website not found: " + domain);
  return site;
}

async function tusUpload({ url, authKey, restAuthKey, dest, filePath }) {
  const size = fs.statSync(filePath).size;
  const create = await axios({
    method: "POST",
    url: `${url}/${dest}?override=true`,
    headers: {
      "X-Auth": authKey,
      "X-Auth-Rest": restAuthKey,
      "Tus-Resumable": "1.0.0",
      "Upload-Length": String(size),
      "Upload-Offset": "0",
    },
    validateStatus: () => true,
  });
  if (create.status !== 201 && create.status !== 200) {
    throw new Error(`tus create ${create.status}: ${JSON.stringify(create.data)}`);
  }
  const patch = await axios({
    method: "PATCH",
    url: `${url}/${dest}?override=true`,
    headers: {
      "X-Auth": authKey,
      "X-Auth-Rest": restAuthKey,
      "Tus-Resumable": "1.0.0",
      "Content-Type": "application/offset+octet-stream",
      "Upload-Offset": "0",
    },
    data: fs.createReadStream(filePath),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: () => true,
  });
  if (patch.status !== 204 && patch.status !== 200) {
    throw new Error(`tus patch ${patch.status}: ${JSON.stringify(patch.data)}`);
  }
  console.log("   uploaded", dest, size, "bytes");
}

async function main() {
  const forcedDomain = process.env.HOSTINGER_DOMAIN || null;

  console.log("1/7 Free subdomain / domain…");
  let domain = forcedDomain;
  if (!domain) {
    const free = await api("POST", "api/hosting/v1/domains/free-subdomains", {});
    if (free.status >= 300) throw new Error("free-subdomain " + free.status);
    domain = free.data?.domain || free.data?.data?.domain;
  }
  console.log("   →", domain);

  console.log("2/7 Create website on order", ORDER_ID);
  let setup = await api("POST", `api/hosting/v1/orders/${ORDER_ID}/onboardings`, {
    domain,
  });
  if (setup.status >= 300 && setup.status !== 409) {
    setup = await api("POST", "api/hosting/v1/websites", {
      domain,
      order_id: ORDER_ID,
    });
  }
  console.log("   create http", setup.status);

  console.log("3/7 Wait setup…");
  await waitSetup(domain);
  const site = await getWebsite(domain);
  const username = site.username;
  console.log("   username", username, "type", site.website_type);

  console.log("4/7 Prepare build scripts…");
  const pkgPath = path.join(ROOT, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.scripts.build =
    "prisma generate && prisma migrate deploy && tsx prisma/seed.ts && next build";
  pkg.scripts.start = "next start -H 0.0.0.0 -p ${PORT:-3000}";
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  // Ensure production DATABASE_URL default for sqlite during build
  fs.writeFileSync(
    path.join(ROOT, ".env"),
    'DATABASE_URL="file:./prod.db"\nNODE_ENV=production\n',
  );

  console.log("5/7 Zip source…");
  const ts = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const zipName = `rotta_erp_${ts}.zip`;
  const zipPath = path.join(ROOT, zipName);
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
      "*.db",
      "*.db-journal",
      ".env.local",
      "rotta_erp_*.zip",
      "scripts/hostinger_probe.mjs",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (zip.status !== 0) throw new Error(zip.stderr || "zip failed");
  console.log("   ", zipName, fs.statSync(zipPath).size, "bytes");

  console.log("6/7 Upload + start Node build…");
  // upload URL
  let up = await api(
    "POST",
    `api/hosting/v1/accounts/${username}/websites/${domain}/files/upload`,
    {},
  );
  if (up.status >= 300) {
    up = await api(
      "GET",
      `api/hosting/v1/accounts/${username}/websites/${domain}/files/upload`,
    );
  }
  if (up.status >= 300) {
    up = await api(
      "POST",
      `api/hosting/v1/accounts/${username}/websites/${encodeURIComponent(domain)}/files/generate-upload-url`,
      {},
    );
  }
  console.log("   upload endpoint", up.status, JSON.stringify(up.data).slice(0, 300));
  const upload = up.data?.data || up.data || {};
  const url = upload.url;
  const authKey = upload.auth_key;
  const restAuthKey = upload.rest_auth_key;
  if (!url || !authKey || !restAuthKey) {
    throw new Error("upload credentials missing: " + JSON.stringify(up.data));
  }

  await tusUpload({
    url,
    authKey,
    restAuthKey,
    dest: "app.zip",
    filePath: zipPath,
  });

  // Detect / set build settings
  let settings = await api(
    "POST",
    `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/build-settings-from-archive`,
    { archive_path: "app.zip" },
  );
  console.log("   settings-from-archive", settings.status, JSON.stringify(settings.data).slice(0, 500));

  const detected = settings.data?.data || settings.data || {};
  const buildPayload = {
    source_type: "archive",
    source_options: { archive_path: "app.zip" },
    app_type: detected.app_type || detected.appType || "next",
    node_version: detected.node_version || detected.nodeVersion || 22,
    build_script: detected.build_script || detected.buildScript || "build",
    root_directory: detected.root_directory || detected.rootDirectory || ".",
    package_manager: detected.package_manager || detected.packageManager || "npm",
  };
  if (detected.output_directory || detected.outputDirectory) {
    buildPayload.output_directory = detected.output_directory || detected.outputDirectory;
  }

  // Persist settings
  const saveSettings = await api(
    "PUT",
    `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/build-settings`,
    buildPayload,
  );
  console.log("   save settings", saveSettings.status);

  // Env vars BEFORE build so prisma migrate sees DATABASE_URL
  const envPut = await api(
    "PUT",
    `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/environment-variables`,
    {
      environment_variables: [
        { key: "DATABASE_URL", value: "file:./prisma/prod.db" },
        { key: "NODE_ENV", value: "production" },
      ],
    },
  );
  if (envPut.status >= 300) {
    const envPut2 = await api(
      "PUT",
      `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/environment-variables`,
      {
        variables: {
          DATABASE_URL: "file:./prisma/prod.db",
          NODE_ENV: "production",
        },
      },
    );
    console.log("   env alt", envPut2.status, JSON.stringify(envPut2.data).slice(0, 250));
  } else {
    console.log("   env", envPut.status);
  }

  const build = await api(
    "POST",
    `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds`,
    buildPayload,
  );
  console.log("   build start", build.status, JSON.stringify(build.data).slice(0, 500));
  if (build.status >= 300) {
    throw new Error("build start failed");
  }

  console.log("7/7 Poll build…");
  let finalState = null;
  let latest = null;
  for (let i = 0; i < 60; i++) {
    await sleep(15000);
    const builds = await api(
      "GET",
      `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds`,
    );
    const list = asList(builds.data);
    latest = list[0] || builds.data;
    const state = latest?.state || latest?.status || latest?.build_state;
    console.log(`   build poll ${i + 1}:`, state, latest?.uuid || latest?.id || "");
    if (["completed", "success", "failed", "error"].includes(String(state))) {
      finalState = state;
      break;
    }
  }

  fs.mkdirSync(path.join(ROOT, ".hostinger"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, ".hostinger", "site.json"),
    JSON.stringify({ domain, username, type: "nodejs", provisional: true }, null, 2) + "\n",
  );

  // cleanup zip
  try {
    fs.unlinkSync(zipPath);
  } catch {}

  if (finalState === "failed" || finalState === "error") {
    const uuid = latest?.uuid || latest?.id;
    if (uuid) {
      const logs = await api(
        "GET",
        `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds/${uuid}/logs`,
      );
      console.error("BUILD LOGS", JSON.stringify(logs.data).slice(0, 4000));
      const analysis = await api(
        "GET",
        `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds/${uuid}/failure-analysis`,
      );
      console.error("ANALYSIS", JSON.stringify(analysis.data).slice(0, 2000));
    }
    throw new Error("Node build failed");
  }

  // verify
  await sleep(5000);
  const live = await axios.get(`https://${domain}/`, {
    validateStatus: () => true,
    timeout: 30000,
  });
  console.log("\nLIVE", live.status, (live.data || "").toString().includes("Rotta") ? "Rotta OK" : "check manually");
  console.log(`URL: https://${domain}/`);
  console.log("Login: demo@rotta.erp / rotta-demo");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
import axios from "/Users/simonemenarbin/.npm/_npx/a7204b5813574340/node_modules/axios/index.js";
import fs from "fs";
import os from "os";
import path from "path";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const BASE = "https://developers.hostinger.com/";
const creds = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), ".config/hostinger-mcp/credentials.json"), "utf8"),
);
const headers = {
  Authorization: `Bearer ${creds.access_token}`,
  "Content-Type": "application/json",
};
async function api(method, p, data) {
  const res = await axios({
    method,
    url: BASE + p.replace(/^\//, ""),
    headers,
    data,
    validateStatus: () => true,
  });
  return { status: res.status, data: res.data };
}

const orders = await api("GET", "api/hosting/v1/orders?per_page=10");
console.log("ORDERS", orders.status);
console.log(JSON.stringify(orders.data, null, 2).slice(0, 2500));

const free = await api("POST", "api/hosting/v1/domains/free-subdomains", {});
console.log("\nFREE", free.status);
console.log(JSON.stringify(free.data, null, 2));

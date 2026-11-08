/** Wrapper so `npm run test:landing` works via node entry. */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync("npx", ["tsx", "scripts/test_landing_builder.ts"], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);

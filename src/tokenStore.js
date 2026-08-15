const fs = require("node:fs/promises");
const path = require("node:path");

const { config } = require("./config");

async function readTokens() {
  try {
    const raw = await fs.readFile(config.tiktok.tokenStorePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function writeTokens(tokenResponse) {
  const currentTokens = await readTokens();
  const now = Date.now();
  const expiresInMs = Number(tokenResponse.expires_in || 0) * 1000;

  const nextTokens = {
    ...currentTokens,
    ...tokenResponse,
    received_at: now,
    expires_at: expiresInMs > 0 ? now + expiresInMs : undefined,
  };

  await fs.mkdir(path.dirname(config.tiktok.tokenStorePath), {
    recursive: true,
  });
  await fs.writeFile(
    config.tiktok.tokenStorePath,
    `${JSON.stringify(nextTokens, null, 2)}\n`,
    "utf8",
  );

  return nextTokens;
}

async function clearTokens() {
  try {
    await fs.unlink(config.tiktok.tokenStorePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

module.exports = {
  clearTokens,
  readTokens,
  writeTokens,
};

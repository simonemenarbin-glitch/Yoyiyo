const path = require("node:path");

require("dotenv").config({ quiet: true });

const port = Number.parseInt(process.env.PORT || "3000", 10);
const appBaseUrl = process.env.APP_BASE_URL || `http://localhost:${port}`;

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port,
  appBaseUrl,
  cookieSecret: process.env.COOKIE_SECRET || "development-cookie-secret",
  tiktok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY || "",
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || "",
    redirectUri:
      process.env.TIKTOK_REDIRECT_URI ||
      `${appBaseUrl}/auth/tiktok/callback`,
    scopes: (process.env.TIKTOK_SCOPES || "user.info.basic,video.publish")
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean),
    tokenStorePath: path.resolve(
      process.cwd(),
      process.env.TOKEN_STORE_PATH || ".data/tiktok-tokens.json",
    ),
  },
};

function hasTikTokConfig() {
  return Boolean(config.tiktok.clientKey && config.tiktok.clientSecret);
}

function requireTikTokConfig() {
  if (!hasTikTokConfig()) {
    const missing = [];

    if (!config.tiktok.clientKey) {
      missing.push("TIKTOK_CLIENT_KEY");
    }

    if (!config.tiktok.clientSecret) {
      missing.push("TIKTOK_CLIENT_SECRET");
    }

    const error = new Error(
      `Missing TikTok configuration: ${missing.join(", ")}`,
    );
    error.statusCode = 500;
    throw error;
  }

  return config.tiktok;
}

module.exports = {
  config,
  hasTikTokConfig,
  requireTikTokConfig,
};

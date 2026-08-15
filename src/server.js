const crypto = require("node:crypto");

const cookieParser = require("cookie-parser");
const express = require("express");
const helmet = require("helmet");

const {
  config,
  hasTikTokConfig,
  requireTikTokConfig,
} = require("./config");
const {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchPublishStatus,
  getCreatorInfo,
  getUserInfo,
  publishVideoFromUrl,
  refreshAccessToken,
  shouldRefresh,
} = require("./tiktokApi");
const { clearTokens, readTokens, writeTokens } = require("./tokenStore");

const app = express();

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser(config.cookieSecret));
app.use(express.static("public"));

function oauthCookieOptions() {
  return {
    httpOnly: true,
    maxAge: 10 * 60 * 1000,
    sameSite: "lax",
    secure: config.nodeEnv === "production",
    signed: true,
  };
}

function publicTokenStatus(tokens) {
  return {
    connected: Boolean(tokens?.access_token),
    openId: tokens?.open_id || null,
    scope: tokens?.scope || null,
    expiresAt: tokens?.expires_at || null,
  };
}

async function getAuthorizedTokens() {
  const tiktokConfig = requireTikTokConfig();
  const tokens = await readTokens();

  if (!tokens?.access_token) {
    const error = new Error("TikTok account is not connected.");
    error.statusCode = 401;
    throw error;
  }

  if (!shouldRefresh(tokens)) {
    return tokens;
  }

  const refreshedTokens = await refreshAccessToken(
    tiktokConfig,
    tokens.refresh_token,
  );

  return writeTokens(refreshedTokens);
}

function asyncRoute(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

app.get("/api/status", asyncRoute(async (_request, response) => {
  const tokens = await readTokens();

  response.json({
    appBaseUrl: config.appBaseUrl,
    configured: hasTikTokConfig(),
    redirectUri: config.tiktok.redirectUri,
    scopes: config.tiktok.scopes,
    token: publicTokenStatus(tokens),
  });
}));

app.get("/auth/tiktok", (request, response, next) => {
  try {
    const tiktokConfig = requireTikTokConfig();
    const state = crypto.randomBytes(24).toString("hex");

    response.cookie("tiktok_oauth_state", state, oauthCookieOptions());
    response.redirect(buildAuthorizationUrl(tiktokConfig, state));
  } catch (error) {
    next(error);
  }
});

app.get("/auth/tiktok/callback", asyncRoute(async (request, response) => {
  const expectedState = request.signedCookies.tiktok_oauth_state;

  if (!expectedState || request.query.state !== expectedState) {
    const error = new Error("Invalid TikTok OAuth state.");
    error.statusCode = 400;
    throw error;
  }

  if (request.query.error) {
    const error = new Error(
      request.query.error_description || request.query.error,
    );
    error.statusCode = 400;
    throw error;
  }

  if (!request.query.code) {
    const error = new Error("Missing TikTok OAuth code.");
    error.statusCode = 400;
    throw error;
  }

  const tokenResponse = await exchangeCodeForToken(
    requireTikTokConfig(),
    request.query.code,
  );

  await writeTokens(tokenResponse);
  response.clearCookie("tiktok_oauth_state");
  response.redirect("/?connected=1");
}));

app.post("/api/logout", asyncRoute(async (_request, response) => {
  await clearTokens();
  response.json({ ok: true });
}));

app.get("/api/account", asyncRoute(async (_request, response) => {
  const tokens = await getAuthorizedTokens();
  response.json(await getUserInfo(tokens.access_token));
}));

app.post("/api/creator-info", asyncRoute(async (_request, response) => {
  const tokens = await getAuthorizedTokens();
  response.json(await getCreatorInfo(tokens.access_token));
}));

app.post("/api/publish/video-url", asyncRoute(async (request, response) => {
  const tokens = await getAuthorizedTokens();
  response.json(await publishVideoFromUrl(tokens.access_token, request.body));
}));

app.get("/api/publish/status/:publishId", asyncRoute(async (request, response) => {
  const tokens = await getAuthorizedTokens();
  response.json(
    await fetchPublishStatus(tokens.access_token, request.params.publishId),
  );
}));

app.use((error, _request, response, _next) => {
  const statusCode = error.statusCode || 500;

  response.status(statusCode).json({
    error: {
      message: error.message,
      details: error.details,
    },
  });
});

app.listen(config.port, () => {
  console.log(`TikTok mini app running at ${config.appBaseUrl}`);
});

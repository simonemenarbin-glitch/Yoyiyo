const TIKTOK_API_BASE_URL = "https://open.tiktokapis.com/v2";
const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;

function buildAuthorizationUrl({ clientKey, redirectUri, scopes }, state) {
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: scopes.join(","),
    redirect_uri: redirectUri,
    state,
  });

  return `${TIKTOK_AUTH_URL}?${params.toString()}`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const rawBody = await response.text();
  let body = {};

  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      body = { raw: rawBody };
    }
  }

  if (!response.ok) {
    const error = new Error(
      body.error_description ||
        body.message ||
        body?.error?.message ||
        `TikTok API request failed with ${response.status}`,
    );
    error.statusCode = response.status;
    error.details = body;
    throw error;
  }

  if (body?.error?.code && body.error.code !== "ok") {
    const error = new Error(body.error.message || body.error.code);
    error.statusCode = 502;
    error.details = body;
    throw error;
  }

  return body;
}

async function exchangeCodeForToken(tiktokConfig, code) {
  const form = new URLSearchParams({
    client_key: tiktokConfig.clientKey,
    client_secret: tiktokConfig.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: tiktokConfig.redirectUri,
  });

  return requestJson(`${TIKTOK_API_BASE_URL}/oauth/token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
}

async function refreshAccessToken(tiktokConfig, refreshToken) {
  const form = new URLSearchParams({
    client_key: tiktokConfig.clientKey,
    client_secret: tiktokConfig.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  return requestJson(`${TIKTOK_API_BASE_URL}/oauth/token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
}

function shouldRefresh(tokens) {
  return Boolean(
    tokens?.refresh_token &&
      tokens?.expires_at &&
      Date.now() >= tokens.expires_at - TOKEN_REFRESH_BUFFER_MS,
  );
}

async function callTikTokApi(accessToken, path, options = {}) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    ...options.headers,
  };

  let body = options.body;
  if (body && typeof body !== "string") {
    headers["Content-Type"] = "application/json; charset=UTF-8";
    body = JSON.stringify(body);
  }

  return requestJson(`${TIKTOK_API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body,
  });
}

async function getUserInfo(accessToken) {
  return callTikTokApi(
    accessToken,
    "/user/info/?fields=open_id,union_id,avatar_url,display_name",
  );
}

async function getCreatorInfo(accessToken) {
  return callTikTokApi(accessToken, "/post/publish/creator_info/query/", {
    method: "POST",
    body: {},
  });
}

async function publishVideoFromUrl(accessToken, input) {
  const videoUrl = String(input.videoUrl || "").trim();

  if (!videoUrl.startsWith("https://")) {
    const error = new Error("videoUrl must be a public HTTPS URL.");
    error.statusCode = 400;
    throw error;
  }

  const title = String(input.title || "").trim();
  if (!title) {
    const error = new Error("title is required.");
    error.statusCode = 400;
    throw error;
  }

  return callTikTokApi(accessToken, "/post/publish/video/init/", {
    method: "POST",
    body: {
      post_info: {
        title,
        privacy_level: input.privacyLevel || "SELF_ONLY",
        disable_duet: Boolean(input.disableDuet),
        disable_comment: Boolean(input.disableComment),
        disable_stitch: Boolean(input.disableStitch),
        video_cover_timestamp_ms: Number(
          input.videoCoverTimestampMs || 1000,
        ),
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl,
      },
    },
  });
}

async function fetchPublishStatus(accessToken, publishId) {
  if (!publishId) {
    const error = new Error("publishId is required.");
    error.statusCode = 400;
    throw error;
  }

  return callTikTokApi(accessToken, "/post/publish/status/fetch/", {
    method: "POST",
    body: {
      publish_id: publishId,
    },
  });
}

module.exports = {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchPublishStatus,
  getCreatorInfo,
  getUserInfo,
  publishVideoFromUrl,
  refreshAccessToken,
  shouldRefresh,
};

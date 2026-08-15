const statusElement = document.querySelector("#status");
const outputElement = document.querySelector("#output");
const accountButton = document.querySelector("#accountButton");
const creatorInfoButton = document.querySelector("#creatorInfoButton");
const logoutButton = document.querySelector("#logoutButton");
const publishForm = document.querySelector("#publishForm");

function showOutput(value) {
  outputElement.textContent = JSON.stringify(value, null, 2);
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, options);
  const body = await response.json();

  if (!response.ok) {
    throw body;
  }

  return body;
}

async function loadStatus() {
  try {
    const status = await requestJson("/api/status");
    statusElement.textContent = JSON.stringify(status, null, 2);
  } catch (error) {
    statusElement.textContent = JSON.stringify(error, null, 2);
  }
}

accountButton.addEventListener("click", async () => {
  try {
    showOutput(await requestJson("/api/account"));
  } catch (error) {
    showOutput(error);
  }
});

creatorInfoButton.addEventListener("click", async () => {
  try {
    showOutput(
      await requestJson("/api/creator-info", {
        method: "POST",
      }),
    );
  } catch (error) {
    showOutput(error);
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    showOutput(
      await requestJson("/api/logout", {
        method: "POST",
      }),
    );
    await loadStatus();
  } catch (error) {
    showOutput(error);
  }
});

publishForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(publishForm);
  const payload = {
    videoUrl: data.get("videoUrl"),
    title: data.get("title"),
    privacyLevel: data.get("privacyLevel"),
    disableDuet: data.get("disableDuet") === "on",
    disableComment: data.get("disableComment") === "on",
    disableStitch: data.get("disableStitch") === "on",
  };

  try {
    showOutput(
      await requestJson("/api/publish/video-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    );
    await loadStatus();
  } catch (error) {
    showOutput(error);
  }
});

loadStatus();

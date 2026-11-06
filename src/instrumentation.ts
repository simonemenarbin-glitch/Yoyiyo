export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureDatabase } = await import("./lib/bootstrap-db");
    await ensureDatabase();
  } catch (err) {
    // Never crash the server process on bootstrap; login/layout will retry.
    console.error("[rotta] instrumentation bootstrap deferred", err);
  }
}

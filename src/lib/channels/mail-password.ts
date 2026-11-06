import fs from "fs";
import path from "path";

/** Password IMAP condivisa Yoyiyo — mai loggata. */
export function loadLocalMailPassword(): string | null {
  if (process.env.ROTTA_IMAP_PASSWORD) return process.env.ROTTA_IMAP_PASSWORD;
  if (process.env.IMAP_PASSWORD) return process.env.IMAP_PASSWORD;

  const cfg =
    process.env.ROTTA_MAIL_CONFIG_PATH ||
    "/Users/simonemenarbin/cloud-cina-b2b/data/mail-config.php";
  try {
    if (!fs.existsSync(cfg)) return null;
    const text = fs.readFileSync(cfg, "utf8");
    const m = text.match(/'pass'\s*=>\s*'([^']+)'/);
    return m?.[1] || null;
  } catch {
    return null;
  }
}

export function defaultImapAccounts() {
  return [
    { label: "booking@yoyiyo.it", username: "booking@yoyiyo.it" },
    { label: "info@yoyiyo.it", username: "info@yoyiyo.it" },
    { label: "simone@yoyiyo.it", username: "simone@yoyiyo.it" },
  ];
}

export function mailConfigPathHint() {
  return path.basename(
    process.env.ROTTA_MAIL_CONFIG_PATH ||
      "/Users/simonemenarbin/cloud-cina-b2b/data/mail-config.php",
  );
}

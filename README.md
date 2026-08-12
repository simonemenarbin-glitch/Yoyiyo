# Yoyiyo

## Google Drive MCP

This repository includes a project-level Cursor MCP configuration at
`.cursor/mcp.json` for Google Drive access through
`@piotr-agier/google-drive-mcp`.

To enable it on a machine or Cloud Agent:

1. In Google Cloud Console, enable the Google Drive API for your project.
   Enable Docs, Sheets, Slides, and Calendar APIs too if you want those tools.
2. Configure the OAuth consent screen and add your Google account as a test user
   while the app is in testing mode.
3. Create an OAuth client with application type `Desktop app`.
4. Download the OAuth JSON file and save it as:

   ```text
   ~/.config/google-drive-mcp/gcp-oauth.keys.json
   ```

5. Authenticate locally:

   ```bash
   npx -y @piotr-agier/google-drive-mcp auth
   ```

6. Restart Cursor and check MCP status with `MCP: Show Servers`.

Never commit OAuth credentials, service account keys, or token files.

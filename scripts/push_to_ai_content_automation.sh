#!/usr/bin/env bash
# Push Rotta ERP into the GitHub repo used by Cursor project "AI Content Automation".
# Requires: gh auth login   OR   export GH_TOKEN=ghp_...
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/tmp/Yoyiyo-push"
if [[ ! -d "$SRC/.git" ]]; then
  echo "Missing prepared repo at $SRC — ask the agent to rebuild it."
  exit 1
fi
cd "$SRC"
if ! gh auth status >/dev/null 2>&1 && [[ -z "${GH_TOKEN:-}${GITHUB_TOKEN:-}" ]]; then
  echo "Serve login GitHub:"
  echo "  gh auth login -h github.com -p https -w"
  echo "oppure: export GH_TOKEN=ghp_xxx"
  exit 2
fi
BRANCH="${1:-cursor/rotta-erp-45c4}"
git push -u origin "HEAD:${BRANCH}"
echo "Pushed to https://github.com/simonemenarbin-glitch/Yoyiyo/tree/${BRANCH}"
echo "Poi in AI Content Automation: apri un agente su quel branch (o merge su main)."

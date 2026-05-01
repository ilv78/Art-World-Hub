#!/usr/bin/env bash
# PreToolUse hook on Bash. Reminds Claude to read specs/workflows/DEPLOYMENT.md
# before improvising sudo/nginx commands against the production/staging VPS.
# See #550 — Claude improvised raw sudo cp/reload chains for staging instead of
# using the documented passwordless `deploy-nginx-config` helper, forcing a
# password prompt that the helper would have avoided.
#
# Triggers when a Bash command contains all three signals:
#   1. "ssh"
#   2. a VPS host/user marker (artverse.idata.ro, staging@, production@, @artverse)
#   3. an infra-sensitive token (sudo, nginx, systemctl, /etc/nginx)
#
# On match: emits a hookSpecificOutput.additionalContext reminder. Non-blocking.
# On no match: exits silently with code 0.

set -euo pipefail

cmd=$(jq -r '.tool_input.command // ""')

if [[ "$cmd" =~ ssh ]] \
  && [[ "$cmd" =~ (artverse\.idata\.ro|staging@|production@|@artverse) ]] \
  && [[ "$cmd" =~ (sudo|nginx|systemctl|/etc/nginx) ]]; then

  msg="VPS infra reminder (per #550): this command targets the artverse.idata.ro VPS with sudo/nginx/systemctl. Read specs/workflows/DEPLOYMENT.md §5 first. Prefer the documented passwordless helper 'sudo deploy-nginx-config <source> <dest-name>' over improvising 'sudo cp + nginx -t + systemctl reload' chains — the helper is in the NOPASSWD list, backs up + validates + reloads + auto-rollbacks on nginx -t failure. NOPASSWD list: deploy-nginx-config, remove-nginx-config, nginx -t, nginx -s reload. Anything else will prompt the user for a password."

  jq -n --arg msg "$msg" '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:$msg}}'
fi

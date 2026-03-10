#!/usr/bin/env bash
# =============================================================================
# ArtVerse VPS Setup Script
# Run this as root on the VPS: bash server-setup.sh
# =============================================================================
set -euo pipefail

DEPLOY_PUBKEY="${1:?Usage: bash server-setup.sh '<ssh-public-key-content>'}"

echo "=== Creating staging user ==="
if id "staging" &>/dev/null; then
  echo "User 'staging' already exists, skipping"
else
  useradd -m -s /bin/bash staging
  echo "Created user 'staging'"
fi

echo "=== Creating production user ==="
if id "production" &>/dev/null; then
  echo "User 'production' already exists, skipping"
else
  useradd -m -s /bin/bash production
  echo "Created user 'production'"
fi

echo "=== Setting up SSH keys ==="
for user in staging production; do
  home_dir=$(eval echo "~$user")
  mkdir -p "$home_dir/.ssh"

  # Add key if not already present
  if ! grep -qF "$DEPLOY_PUBKEY" "$home_dir/.ssh/authorized_keys" 2>/dev/null; then
    echo "$DEPLOY_PUBKEY" >> "$home_dir/.ssh/authorized_keys"
    echo "Added deploy key for $user"
  else
    echo "Deploy key already present for $user"
  fi

  chmod 700 "$home_dir/.ssh"
  chmod 600 "$home_dir/.ssh/authorized_keys"
  chown -R "$user:$user" "$home_dir/.ssh"
done

echo "=== Adding users to docker group ==="
usermod -aG docker staging
usermod -aG docker production
echo "Both users can now run Docker commands"

echo "=== Creating app directories ==="
for user in staging production; do
  home_dir=$(eval echo "~$user")
  mkdir -p "$home_dir/app"
  chown -R "$user:$user" "$home_dir/app"
  echo "Created $home_dir/app"
done

echo "=== Logging into GHCR (needed once for image pulls) ==="
echo "After this script, run the following for each user:"
echo "  su - staging -c 'docker login ghcr.io -u ilv78'"
echo "  su - production -c 'docker login ghcr.io -u ilv78'"
echo "(Use a GitHub Personal Access Token with read:packages scope as the password)"

echo ""
echo "=== Setup complete ==="
echo "Staging home:    /home/staging/app"
echo "Production home: /home/production/app"
echo ""
echo "Next steps:"
echo "1. Log both users into GHCR (see above)"
echo "2. Set up DNS A records for artverse.idata.ro and staging.artverse.idata.ro"
echo "3. Copy Nginx configs and run certbot for SSL"

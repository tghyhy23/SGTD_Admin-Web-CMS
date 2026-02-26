#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd ~/SGTD_Admin-Web-CMS
echo "[deploy] Pulling latest code..."
git pull origin main
echo "[deploy] Installing dependencies..."
npm install
echo "[deploy] Building..."
npm run build
echo "[deploy] Restarting PM2..."
pm2 restart sgtd-cms
echo "[deploy] Done! $(date)"

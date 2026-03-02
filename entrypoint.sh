#!/bin/sh
echo "[roxy] Pulling latest from GitHub..."
git pull

echo "[roxy] Installing dependencies..."
npm ci

echo "[roxy] Compiling TypeScript..."
npx tsc

echo "[roxy] Starting Roxy..."
exec node src/index.js
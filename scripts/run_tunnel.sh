#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

exec cloudflared tunnel \
  --no-autoupdate \
  --protocol http2 \
  --url http://127.0.0.1:4173
